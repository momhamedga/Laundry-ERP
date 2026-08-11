import type { AuditAction, Prisma } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { RequestContext } from "../auth/auth.types.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { ExpensesRepository } from "./expenses.repository.js";
import type { ExpenseRow, ListExpensesResult, OperatingSummary } from "./expenses.types.js";
import type {
  CancelExpenseDto,
  CreateExpenseDto,
  ListExpensesQuery,
  OperatingSummaryQuery,
  UpdateExpenseDto,
} from "./expenses.validator.js";

export class ExpensesService {
  constructor(private readonly repo: ExpensesRepository) {}

  list(query: ListExpensesQuery): Promise<ListExpensesResult> {
    return this.repo.list(query);
  }

  async getById(id: string): Promise<ExpenseRow> {
    const expense = await this.repo.findById(id);
    if (!expense) throw new ApiError(404, "المصروف غير موجود.");
    return expense;
  }

  /** الفرع موجود ونشط - يمنع نسب مصروف لفرع موقوف فيختفي من تقاريره */
  private async ensureActiveBranch(branchId: string): Promise<void> {
    const branch = await this.repo.findActiveBranch(branchId);
    if (!branch) throw new ApiError(404, "الفرع غير موجود أو غير نشط.");
  }

  async create(
    dto: CreateExpenseDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<ExpenseRow> {
    await this.ensureActiveBranch(dto.branchId);

    /**
     * المنشئ من الجلسة لا من الجسم.
     *
     * لو قُرئ من الطلب لأمكن لأي مستخدم نسب مصروف لزميله، فيصير سجلّ التدقيق
     * نفسه مصدر التضليل بدل أن يكون مرجع الحقيقة.
     */
    const expense = await this.repo.create({
      amount: dto.amount,
      category: dto.category,
      branchId: dto.branchId,
      expenseDate: dto.expenseDate,
      notes: dto.notes ?? null,
      createdById: actor.id,
    });

    await this.audit("EXPENSE_CREATED", actor, ctx, {
      expenseId: expense.id,
      amount: expense.amount.toString(),
      category: expense.category,
      branchId: expense.branchId,
    });
    return expense;
  }

  async update(
    id: string,
    dto: UpdateExpenseDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<ExpenseRow> {
    const existing = await this.getById(id);

    /**
     * الملغى لا يُعدَّل.
     *
     * تعديله يجعل سجلّ الإلغاء يصف واقعةً غير التي أُلغيت فعلاً — والمراجع بعد
     * شهور لا يملك ما يكشف ذلك.
     */
    if (existing.status === "CANCELLED") {
      throw new ApiError(409, "لا يمكن تعديل مصروف ملغى.");
    }
    if (dto.branchId !== undefined) await this.ensureActiveBranch(dto.branchId);

    const data: Prisma.ExpenseUncheckedUpdateInput = {
      ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.branchId !== undefined ? { branchId: dto.branchId } : {}),
      ...(dto.expenseDate !== undefined ? { expenseDate: dto.expenseDate } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    };

    const updated = await this.repo.update(id, data);

    /**
     * التدقيق يحفظ القيمة قبل وبعد للحقول المالية وحدها.
     *
     * «عُدِّل المصروف» بلا قيم لا يجيب السؤال الذي يُسأل عند المراجعة: من غيّر
     * المبلغ ومن كم إلى كم.
     */
    await this.audit("EXPENSE_UPDATED", actor, ctx, {
      expenseId: id,
      changes: Object.keys(dto),
      ...(dto.amount !== undefined
        ? { amountBefore: existing.amount.toString(), amountAfter: updated.amount.toString() }
        : {}),
      ...(dto.category !== undefined
        ? { categoryBefore: existing.category, categoryAfter: updated.category }
        : {}),
    });
    return updated;
  }

  /**
   * الإلغاء بدل الحذف.
   *
   * سياسة المشروع للسجلات المالية (Payment وPurchase كلاهما CANCELLED): السجلّ
   * المحذوف يجعل أي مراجعة لاحقة مستحيلة — يختلف الإجمالي ولا يبقى أثرٌ يفسّر
   * السبب. الملغى يبقى ظاهراً ويخرج من كل حساب، والسبب مُلزَم ومحفوظ.
   */
  async cancel(
    id: string,
    dto: CancelExpenseDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<ExpenseRow> {
    const existing = await this.getById(id);
    if (existing.status === "CANCELLED") {
      throw new ApiError(409, "المصروف ملغى بالفعل.");
    }

    const cancelled = await this.repo.update(id, {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: dto.reason,
      cancelledById: actor.id,
    });

    await this.audit("EXPENSE_CANCELLED", actor, ctx, {
      expenseId: id,
      amount: existing.amount.toString(),
      category: existing.category,
      reason: dto.reason,
    });
    return cancelled;
  }

  /**
   * ملخّص التشغيل لفترة.
   *
   * يُعيد استخدام تعريف الإيراد القائم بحرفيّته (صافي المدفوعات المحصّلة) بدل
   * اشتقاق تعريف ثانٍ — رقمان مختلفان لنفس السؤال في شاشتين أسوأ من غياب
   * الشاشة الثانية.
   *
   * والنتيجة «ناتج تشغيلي» لا «صافي ربح»: لا ضرائب ولا التزامات غير مسجَّلة ولا
   * إهلاك. تسميته ربحاً تجعل القرار يُبنى على رقم ناقص.
   */
  async operatingSummary(query: OperatingSummaryQuery): Promise<OperatingSummary> {
    if (query.from.getTime() > query.to.getTime()) {
      throw new ApiError(400, "تاريخ البداية يجب ألا يتجاوز تاريخ النهاية.");
    }

    const [revenue, expenses] = await Promise.all([
      this.repo.sumRevenueBetween(query.from, query.to, query.branchId),
      this.repo.sumActiveBetween(query.from, query.to, query.branchId),
    ]);

    return {
      from: query.from.toISOString(),
      to: query.to.toISOString(),
      branchId: query.branchId ?? null,
      revenue,
      expenses,
      operatingResult: (Number(revenue) - Number(expenses)).toFixed(2),
    };
  }

  private audit(
    action: AuditAction,
    actor: AuthenticatedUser,
    ctx: RequestContext,
    metadata: Prisma.InputJsonValue,
  ): Promise<unknown> {
    return this.repo.createAuditLog({
      action,
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata,
    });
  }
}
