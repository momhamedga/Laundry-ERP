import { Prisma } from "@prisma/client";
import type { AuditAction, PrismaClient } from "@prisma/client";
import type { ExpenseRow, ListExpensesResult } from "./expenses.types.js";
import type { ListExpensesQuery } from "./expenses.validator.js";

/** ما يُضمّ دائماً - الفرع والمنشئ للعرض بلا استعلام إضافي لكل صفّ */
const INCLUDE = {
  branch: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  cancelledBy: { select: { id: true, name: true } },
} satisfies Prisma.ExpenseInclude;

export class ExpensesRepository {
  constructor(private readonly db: PrismaClient) {}

  /**
   * شرط التصفية.
   *
   * كل مرشّح يُترجم إلى شرط في قاعدة البيانات — لا تصفية في الذاكرة. البحث على
   * الملاحظات بـ`contains` مُمرَّر كمعامل عبر Prisma، فلا حقن.
   */
  private buildWhere(query: ListExpensesQuery): Prisma.ExpenseWhereInput {
    const where: Prisma.ExpenseWhereInput = {};

    if (query.search !== undefined) {
      where.notes = { contains: query.search, mode: "insensitive" };
    }
    if (query.category !== undefined) where.category = query.category;
    if (query.status !== undefined) where.status = query.status;
    if (query.branchId !== undefined) where.branchId = query.branchId;

    if (query.from !== undefined || query.to !== undefined) {
      where.expenseDate = {
        ...(query.from !== undefined ? { gte: query.from } : {}),
        ...(query.to !== undefined ? { lte: query.to } : {}),
      };
    }
    return where;
  }

  /**
   * القائمة مع الإجمالي.
   *
   * `_sum` على نفس الشرط في قاعدة البيانات: جمع الصفحة المعروضة في المتصفّح
   * كان سيُنتج رقماً يتغيّر بتغيير حجم الصفحة ويُقرأ كإجمالي الفترة.
   * والملغاة مستبعدة من الإجمالي دائماً — تبقى ظاهرة في السجلّ ولا تُحتسب.
   */
  async list(query: ListExpensesQuery): Promise<ListExpensesResult> {
    const where = this.buildWhere(query);
    const skip = (query.page - 1) * query.limit;

    const [expenses, total, sum] = await Promise.all([
      this.db.expense.findMany({
        where,
        include: INCLUDE,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take: query.limit,
      }),
      this.db.expense.count({ where }),
      this.db.expense.aggregate({
        where: { ...where, status: "ACTIVE" },
        _sum: { amount: true },
      }),
    ]);

    const totalPages = Math.max(Math.ceil(total / query.limit), 1);
    return {
      expenses: expenses as ExpenseRow[],
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
      totalAmount: (sum._sum.amount ?? 0).toString(),
    };
  }

  findById(id: string): Promise<ExpenseRow | null> {
    return this.db.expense.findUnique({
      where: { id },
      include: INCLUDE,
    }) as Promise<ExpenseRow | null>;
  }

  create(data: Prisma.ExpenseUncheckedCreateInput): Promise<ExpenseRow> {
    return this.db.expense.create({ data, include: INCLUDE }) as Promise<ExpenseRow>;
  }

  update(id: string, data: Prisma.ExpenseUncheckedUpdateInput): Promise<ExpenseRow> {
    return this.db.expense.update({ where: { id }, data, include: INCLUDE }) as Promise<ExpenseRow>;
  }

  /** مجموع المصروفات النشطة في فترة - للملخّص التشغيلي */
  async sumActiveBetween(from: Date, to: Date, branchId?: string): Promise<string> {
    const result = await this.db.expense.aggregate({
      where: {
        status: "ACTIVE",
        expenseDate: { gte: from, lte: to },
        ...(branchId ? { branchId } : {}),
      },
      _sum: { amount: true },
    });
    return (result._sum.amount ?? 0).toString();
  }

  /**
   * صافي المدفوعات المحصّلة في فترة.
   *
   * نفس تعريف لوحة التحكم حرفياً (stats.repository/stats.service): الحالات
   * COMPLETED وREFUNDED، والمبلغ ناقص المسترد. أي تعريف ثانٍ للإيراد في النظام
   * يعني رقمين مختلفين لنفس السؤال في شاشتين.
   */
  async sumRevenueBetween(from: Date, to: Date, branchId?: string): Promise<string> {
    const rows = await this.db.payment.findMany({
      where: {
        status: { in: ["COMPLETED", "REFUNDED"] },
        createdAt: { gte: from, lte: to },
        ...(branchId ? { order: { branchId } } : {}),
      },
      select: { amount: true, refundedAmount: true },
    });

    // الجمع بـDecimal لا بـNumber: مبالغ عشرية كثيرة تتراكم أخطاء تقريبها
    const net = rows.reduce(
      (sum, r) => sum.add(r.amount).sub(r.refundedAmount),
      new Prisma.Decimal(0),
    );
    return net.toString();
  }

  /** هل الفرع موجود ونشط؟ - يمنع نسب مصروف لفرع محذوف أو موقوف */
  findActiveBranch(id: string): Promise<{ id: string } | null> {
    return this.db.branch.findFirst({ where: { id, isActive: true }, select: { id: true } });
  }

  createAuditLog(entry: {
    action: AuditAction;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Prisma.InputJsonValue;
  }): Promise<unknown> {
    return this.db.auditLog.create({ data: entry });
  }
}
