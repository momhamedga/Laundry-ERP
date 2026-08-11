import { beforeAll, describe, expect, it } from "vitest";
import { configureZodArabic } from "../../src/config/zod-locale";
import {
  cancelExpenseSchema,
  createExpenseSchema,
  listExpensesQuerySchema,
  operatingSummaryQuerySchema,
  updateExpenseSchema,
} from "../../src/modules/expenses/expenses.validator";

beforeAll(() => configureZodArabic());

/** cuid حقيقي: المخطّط يفرض الصيغة، و"br1" يفشل التحقّق لا المنطق المُختبَر */
const BRANCH_ID = "clx1a2b3c4d5e6f7g8h9i0jk";

const validCreate = {
  amount: 250.5,
  category: "ELECTRICITY",
  branchId: BRANCH_ID,
  expenseDate: "2026-08-01T00:00:00.000Z",
};

describe("createExpenseSchema", () => {
  it("يقبل مصروفاً صالحاً ويحوّل التاريخ إلى Date", () => {
    const parsed = createExpenseSchema.parse(validCreate);
    expect(parsed.amount).toBe(250.5);
    expect(parsed.expenseDate).toBeInstanceOf(Date);
  });

  it("يرفض المبلغ صفراً", () => {
    expect(() => createExpenseSchema.parse({ ...validCreate, amount: 0 })).toThrow();
  });

  it("يرفض المبلغ السالب", () => {
    expect(() => createExpenseSchema.parse({ ...validCreate, amount: -5 })).toThrow();
  });

  it("يرفض المبلغ فوق الحدّ الأقصى", () => {
    expect(() => createExpenseSchema.parse({ ...validCreate, amount: 10_000_001 })).toThrow();
  });

  it("يرفض NaN و Infinity", () => {
    expect(() => createExpenseSchema.parse({ ...validCreate, amount: Number.NaN })).toThrow();
    expect(() => createExpenseSchema.parse({ ...validCreate, amount: Number.POSITIVE_INFINITY })).toThrow();
  });

  it("يرفض فئة خارج القائمة", () => {
    expect(() => createExpenseSchema.parse({ ...validCreate, category: "BRIBES" })).toThrow();
  });

  it("يرفض غياب الفرع", () => {
    const { branchId: _omit, ...withoutBranch } = validCreate;
    expect(() => createExpenseSchema.parse(withoutBranch)).toThrow();
  });

  it("يرفض تاريخاً غير صالح", () => {
    expect(() => createExpenseSchema.parse({ ...validCreate, expenseDate: "ليس تاريخاً" })).toThrow();
  });

  it("يرفض ملاحظات تتجاوز الحدّ", () => {
    expect(() => createExpenseSchema.parse({ ...validCreate, notes: "x".repeat(501) })).toThrow();
  });

  /**
   * Mass Assignment: الحقول الحسّاسة ليست في المخطّط، وZod يُسقط ما لا يعرفه.
   * لو مُرّرت للمستودع لأمكن لأي مستخدم نسب مصروف لغيره أو تزوير حالته.
   */
  it("يُسقط status و createdById و id من الجسم", () => {
    const parsed = createExpenseSchema.parse({
      ...validCreate,
      id: "forged",
      status: "CANCELLED",
      createdById: "someone-else",
      cancelledAt: new Date().toISOString(),
    }) as Record<string, unknown>;
    expect(parsed.id).toBeUndefined();
    expect(parsed.status).toBeUndefined();
    expect(parsed.createdById).toBeUndefined();
    expect(parsed.cancelledAt).toBeUndefined();
  });

  it("رسائل الخطأ بالعربية", () => {
    const result = createExpenseSchema.safeParse({ ...validCreate, amount: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/[؀-ۿ]/);
    }
  });
});

describe("updateExpenseSchema", () => {
  it("يقبل تعديلاً جزئياً", () => {
    expect(updateExpenseSchema.parse({ amount: 10 })).toEqual({ amount: 10 });
  });

  it("يرفض جسماً فارغاً", () => {
    expect(() => updateExpenseSchema.parse({})).toThrow();
  });

  it("يرفض جسماً لا يحمل إلا حقولاً مجهولة", () => {
    expect(() => updateExpenseSchema.parse({ status: "CANCELLED" })).toThrow();
  });
});

describe("cancelExpenseSchema", () => {
  it("يقبل سبباً صالحاً", () => {
    expect(cancelExpenseSchema.parse({ reason: "مكرر" }).reason).toBe("مكرر");
  });

  it("يرفض سبباً قصيراً جداً", () => {
    expect(() => cancelExpenseSchema.parse({ reason: "x" })).toThrow();
  });

  it("يرفض غياب السبب", () => {
    expect(() => cancelExpenseSchema.parse({})).toThrow();
  });
});

describe("listExpensesQuerySchema", () => {
  it("يطبّق القيم الافتراضية للترقيم", () => {
    const q = listExpensesQuerySchema.parse({});
    expect(q.page).toBe(1);
    expect(q.limit).toBe(20);
  });

  it("يحدّ الحجم الأقصى للصفحة", () => {
    expect(() => listExpensesQuerySchema.parse({ limit: 500 })).toThrow();
  });

  it("يرفض حقل ترتيب خارج القائمة البيضاء", () => {
    expect(() => listExpensesQuerySchema.parse({ sortBy: "createdById" })).toThrow();
  });
});

describe("operatingSummaryQuerySchema", () => {
  it("يلزم المدى الزمني", () => {
    expect(() => operatingSummaryQuerySchema.parse({})).toThrow();
  });

  it("يقبل مدى صالحاً", () => {
    const q = operatingSummaryQuerySchema.parse({
      from: "2026-08-01",
      to: "2026-08-31",
    });
    expect(q.from).toBeInstanceOf(Date);
    expect(q.to).toBeInstanceOf(Date);
  });
});
