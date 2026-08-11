import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser, RequestContext } from "../../src/modules/auth/index";
import type { ExpensesRepository } from "../../src/modules/expenses/expenses.repository";
import { ExpensesService } from "../../src/modules/expenses/expenses.service";

const actor: AuthenticatedUser = { id: "u1", email: "a@b.c", role: "ADMIN", branchId: null };
const ctx: RequestContext = { ipAddress: "127.0.0.1", userAgent: "test" };
const BRANCH_ID = "clx1a2b3c4d5e6f7g8h9i0jk";

function makeExpense(over: Record<string, unknown> = {}) {
  return {
    id: "e1",
    amount: { toString: () => "100.00" },
    category: "RENT",
    status: "ACTIVE",
    notes: null,
    expenseDate: new Date("2026-08-01"),
    cancelledAt: null,
    cancelReason: null,
    cancelledById: null,
    branchId: BRANCH_ID,
    createdById: "u1",
    ...over,
  } as never;
}

function buildRepo(over: Partial<ExpensesRepository> = {}) {
  return {
    list: vi.fn(async () => ({ expenses: [], meta: {}, totalAmount: "0.00" })),
    findById: vi.fn(async () => makeExpense()),
    create: vi.fn(async (d: unknown) => makeExpense(d as object)),
    update: vi.fn(async (_id: string, d: unknown) => makeExpense(d as object)),
    findActiveBranch: vi.fn(async () => ({ id: BRANCH_ID, name: "الفرع" })),
    sumActiveBetween: vi.fn(async () => "300.00"),
    sumRevenueBetween: vi.fn(async () => "1000.00"),
    createAuditLog: vi.fn(async () => undefined),
    ...over,
  } as unknown as ExpensesRepository;
}

describe("ExpensesService.create", () => {
  it("ينسب المصروف لصاحب الجلسة لا لما في الجسم", async () => {
    const repo = buildRepo();
    const service = new ExpensesService(repo);

    await service.create(
      {
        amount: 100,
        category: "RENT",
        branchId: BRANCH_ID,
        expenseDate: new Date("2026-08-01"),
        // محاولة نسب المصروف لمستخدم آخر
        createdById: "attacker",
      } as never,
      actor,
      ctx,
    );

    const passed = vi.mocked(repo.create).mock.calls[0]?.[0] as { createdById: string };
    expect(passed.createdById).toBe("u1");
  });

  it("يرفض فرعاً غير موجود أو غير نشط بـ404", async () => {
    const repo = buildRepo({ findActiveBranch: vi.fn(async () => null) } as never);
    const service = new ExpensesService(repo);

    await expect(
      service.create(
        { amount: 100, category: "RENT", branchId: BRANCH_ID, expenseDate: new Date() } as never,
        actor,
        ctx,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("يكتب سجلّ تدقيق EXPENSE_CREATED", async () => {
    const repo = buildRepo();
    await new ExpensesService(repo).create(
      { amount: 100, category: "RENT", branchId: BRANCH_ID, expenseDate: new Date() } as never,
      actor,
      ctx,
    );
    const log = vi.mocked(repo.createAuditLog).mock.calls[0]?.[0] as { action: string };
    expect(log.action).toBe("EXPENSE_CREATED");
  });
});

describe("ExpensesService.getById", () => {
  it("يرمي 404 لمصروف غير موجود", async () => {
    const repo = buildRepo({ findById: vi.fn(async () => null) } as never);
    await expect(new ExpensesService(repo).getById("nope")).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("ExpensesService.update", () => {
  it("يرفض تعديل مصروف ملغى بـ409", async () => {
    const repo = buildRepo({
      findById: vi.fn(async () => makeExpense({ status: "CANCELLED" })),
    } as never);

    await expect(
      new ExpensesService(repo).update("e1", { amount: 50 } as never, actor, ctx),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("يحفظ المبلغ قبل وبعد في التدقيق", async () => {
    const repo = buildRepo({
      findById: vi.fn(async () => makeExpense({ amount: { toString: () => "100.00" } })),
      update: vi.fn(async () => makeExpense({ amount: { toString: () => "50.00" } })),
    } as never);

    await new ExpensesService(repo).update("e1", { amount: 50 } as never, actor, ctx);

    const log = vi.mocked(repo.createAuditLog).mock.calls[0]?.[0] as {
      action: string;
      metadata: { amountBefore: string; amountAfter: string };
    };
    expect(log.action).toBe("EXPENSE_UPDATED");
    expect(log.metadata.amountBefore).toBe("100.00");
    expect(log.metadata.amountAfter).toBe("50.00");
  });

  it("يتحقّق من الفرع الجديد عند تغييره", async () => {
    const repo = buildRepo({ findActiveBranch: vi.fn(async () => null) } as never);
    await expect(
      new ExpensesService(repo).update("e1", { branchId: BRANCH_ID } as never, actor, ctx),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("لا يمرّر إلا الحقول المُرسَلة", async () => {
    const repo = buildRepo();
    await new ExpensesService(repo).update("e1", { amount: 50 } as never, actor, ctx);
    const data = vi.mocked(repo.update).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(Object.keys(data)).toEqual(["amount"]);
  });
});

describe("ExpensesService.cancel", () => {
  it("يضبط الحالة والسبب والمُلغي ووقت الإلغاء", async () => {
    const repo = buildRepo();
    await new ExpensesService(repo).cancel("e1", { reason: "مكرر" } as never, actor, ctx);

    const data = vi.mocked(repo.update).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(data.status).toBe("CANCELLED");
    expect(data.cancelReason).toBe("مكرر");
    expect(data.cancelledById).toBe("u1");
    expect(data.cancelledAt).toBeInstanceOf(Date);
  });

  it("لا يحذف السجلّ — يحدّثه فقط", async () => {
    const repo = buildRepo() as ExpensesRepository & Record<string, unknown>;
    await new ExpensesService(repo).cancel("e1", { reason: "مكرر" } as never, actor, ctx);
    expect(repo.delete).toBeUndefined();
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it("يرفض إلغاء الملغى بـ409", async () => {
    const repo = buildRepo({
      findById: vi.fn(async () => makeExpense({ status: "CANCELLED" })),
    } as never);
    await expect(
      new ExpensesService(repo).cancel("e1", { reason: "مكرر" } as never, actor, ctx),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("يكتب EXPENSE_CANCELLED بالسبب", async () => {
    const repo = buildRepo();
    await new ExpensesService(repo).cancel("e1", { reason: "مكرر" } as never, actor, ctx);
    const log = vi.mocked(repo.createAuditLog).mock.calls[0]?.[0] as {
      action: string;
      metadata: { reason: string };
    };
    expect(log.action).toBe("EXPENSE_CANCELLED");
    expect(log.metadata.reason).toBe("مكرر");
  });
});

describe("ExpensesService.operatingSummary", () => {
  it("يحسب الناتج التشغيلي = الإيراد − المصروف", async () => {
    const repo = buildRepo();
    const summary = await new ExpensesService(repo).operatingSummary({
      from: new Date("2026-08-01"),
      to: new Date("2026-08-31"),
    } as never);

    expect(summary.revenue).toBe("1000.00");
    expect(summary.expenses).toBe("300.00");
    expect(summary.operatingResult).toBe("700.00");
  });

  it("يُظهر ناتجاً سالباً حين تتجاوز المصروفات الإيراد", async () => {
    const repo = buildRepo({ sumActiveBetween: vi.fn(async () => "1500.00") } as never);
    const summary = await new ExpensesService(repo).operatingSummary({
      from: new Date("2026-08-01"),
      to: new Date("2026-08-31"),
    } as never);
    expect(summary.operatingResult).toBe("-500.00");
  });

  it("يرفض مدى مقلوباً بـ400", async () => {
    const repo = buildRepo();
    await expect(
      new ExpensesService(repo).operatingSummary({
        from: new Date("2026-08-31"),
        to: new Date("2026-08-01"),
      } as never),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("يمرّر الفرع لكلا الطرفين حتى لا يُقارَن إيراد فرعٍ بمصروف الشركة", async () => {
    const repo = buildRepo();
    await new ExpensesService(repo).operatingSummary({
      from: new Date("2026-08-01"),
      to: new Date("2026-08-31"),
      branchId: BRANCH_ID,
    } as never);

    expect(vi.mocked(repo.sumRevenueBetween).mock.calls[0]?.[2]).toBe(BRANCH_ID);
    expect(vi.mocked(repo.sumActiveBetween).mock.calls[0]?.[2]).toBe(BRANCH_ID);
  });
});
