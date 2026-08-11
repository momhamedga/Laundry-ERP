import { describe, expect, it } from "vitest";
import {
  canCancelExpense,
  canEditExpense,
  currentMonthBounds,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  isValidAmount,
  MAX_EXPENSE_AMOUNT,
  rangeToParams,
  toDateInput,
} from "@/lib/expenses";
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES } from "@/types/expenses";

describe("التسميات العربية", () => {
  it("لكل فئة في المخطّط تسمية", () => {
    for (const c of EXPENSE_CATEGORIES) {
      expect(EXPENSE_CATEGORY_LABELS[c]).toBeTruthy();
    }
  });

  it("لا تسميات زائدة عن فئات المخطّط", () => {
    expect(Object.keys(EXPENSE_CATEGORY_LABELS).sort()).toEqual([...EXPENSE_CATEGORIES].sort());
  });

  it("لكل حالة تسمية", () => {
    for (const s of EXPENSE_STATUSES) {
      expect(EXPENSE_STATUS_LABELS[s]).toBeTruthy();
    }
  });

  it("كل التسميات عربية لا رموز enum", () => {
    for (const label of Object.values(EXPENSE_CATEGORY_LABELS)) {
      expect(label).toMatch(/[؀-ۿ]/);
    }
  });
});

describe("قواعد التعديل والإلغاء", () => {
  it("النشط يُعدَّل ويُلغى", () => {
    expect(canEditExpense({ status: "ACTIVE" })).toBe(true);
    expect(canCancelExpense({ status: "ACTIVE" })).toBe(true);
  });

  it("الملغى لا يُعدَّل ولا يُلغى مرّة أخرى", () => {
    expect(canEditExpense({ status: "CANCELLED" })).toBe(false);
    expect(canCancelExpense({ status: "CANCELLED" })).toBe(false);
  });
});

describe("isValidAmount", () => {
  it("يقبل موجباً صالحاً", () => {
    expect(isValidAmount("1")).toBe(true);
    expect(isValidAmount("0.5")).toBe(true);
    expect(isValidAmount(String(MAX_EXPENSE_AMOUNT))).toBe(true);
  });

  it("يرفض الفارغ والصفر والسالب", () => {
    expect(isValidAmount("")).toBe(false);
    expect(isValidAmount("   ")).toBe(false);
    expect(isValidAmount("0")).toBe(false);
    expect(isValidAmount("-3")).toBe(false);
  });

  it("يرفض غير الرقمي وما فوق الحدّ", () => {
    expect(isValidAmount("abc")).toBe(false);
    expect(isValidAmount(String(MAX_EXPENSE_AMOUNT + 1))).toBe(false);
  });
});

describe("toDateInput", () => {
  /**
   * الانحراف اليومي: toISOString يحوّل إلى UTC، فمساء 31 أغسطس محليّاً قد يصير
   * 1 سبتمبر — والمصروف يُسجَّل بشهرٍ غير شهره ويختفي من ملخّصه.
   */
  it("يستخدم التاريخ المحلّي لا UTC", () => {
    const lateEvening = new Date(2026, 7, 31, 23, 30);
    expect(toDateInput(lateEvening)).toBe("2026-08-31");
  });

  it("يُصفّر خانات الشهر واليوم", () => {
    expect(toDateInput(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("rangeToParams", () => {
  /**
   * انحدارٌ مُثبَت حيّاً: التاريخ المجرّد يُقرأ على الخادم منتصف ليلٍ عالمي،
   * والمصروف يُخزَّن منتصف ليلٍ محلّي. في القاهرة (+2/+3) سقط مصروف اليوم
   * المختار من نتيجة يومه تماماً — بحثٌ بـfrom=to=2026-10-15 لم يُعده.
   */
  it("يحوّل البداية إلى بداية اليوم المحلّي", () => {
    const { from } = rangeToParams("2026-10-15");
    expect(from).toBe(new Date(2026, 9, 15, 0, 0, 0, 0).toISOString());
  });

  it("يحوّل النهاية إلى آخر لحظة في اليوم المحلّي", () => {
    const { to } = rangeToParams(undefined, "2026-10-15");
    expect(to).toBe(new Date(2026, 9, 15, 23, 59, 59, 999).toISOString());
  });

  it("يوم واحد يُنتج مدى يغطّي اليوم كاملاً", () => {
    const { from, to } = rangeToParams("2026-10-15", "2026-10-15");
    const sameDayNoon = new Date(2026, 9, 15, 12, 0, 0).toISOString();
    expect(from! <= sameDayNoon).toBe(true);
    expect(to! >= sameDayNoon).toBe(true);
  });

  it("يتجاهل الفارغ وغير الصالح بدل إرسال Invalid Date", () => {
    expect(rangeToParams(undefined, undefined)).toEqual({});
    expect(rangeToParams("", "")).toEqual({});
    expect(rangeToParams("ليس تاريخاً")).toEqual({});
  });
});

describe("currentMonthBounds", () => {
  it("يعيد أوّل وآخر يوم في الشهر", () => {
    const { from, to } = currentMonthBounds(new Date(2026, 7, 15));
    expect(from).toBe("2026-08-01");
    expect(to).toBe("2026-08-31");
  });

  it("يضبط فبراير في سنة كبيسة", () => {
    expect(currentMonthBounds(new Date(2028, 1, 10)).to).toBe("2028-02-29");
  });

  it("يضبط الشهور ذات الثلاثين يوماً", () => {
    expect(currentMonthBounds(new Date(2026, 3, 10)).to).toBe("2026-04-30");
  });
});
