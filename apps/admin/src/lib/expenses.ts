import type { ExpenseCategory, ExpenseRow, ExpenseStatus } from "@/types/expenses";

/**
 * تسميات الفئات — المصدر الوحيد للنصّ العربي في الشاشة.
 *
 * `Record` الكامل لا `Partial`: إضافة فئة في المخطّط دون تسمية هنا تُفشل البناء
 * بدل أن تُظهر «RENT» للمستخدم في الإنتاج.
 */
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  RENT: "إيجار",
  ELECTRICITY: "كهرباء",
  WATER: "مياه",
  SALARIES: "رواتب",
  DETERGENTS: "منظّفات",
  MAINTENANCE: "صيانة",
  TRANSPORTATION: "نقل ومواصلات",
  SUPPLIES: "مستلزمات",
  OTHER: "أخرى",
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  ACTIVE: "نشط",
  CANCELLED: "ملغى",
};

export const EXPENSE_STATUS_VARIANT: Record<ExpenseStatus, "default" | "destructive"> = {
  ACTIVE: "default",
  CANCELLED: "destructive",
};

/**
 * الملغى لا يُعدَّل — نفس قاعدة الخادم (409).
 *
 * مكرّرة هنا عمداً كتحسين تجربة لا كحاجز: الحاجز في الخدمة، وهذا يمنع المستخدم
 * من فتح حوارٍ ينتهي بخطأ.
 */
export function canEditExpense(expense: Pick<ExpenseRow, "status">): boolean {
  return expense.status === "ACTIVE";
}

export function canCancelExpense(expense: Pick<ExpenseRow, "status">): boolean {
  return expense.status === "ACTIVE";
}

/** بداية/نهاية الشهر الحالي — المدى الافتراضي لشاشة المصروفات */
export function currentMonthBounds(now: Date = new Date()): { from: string; to: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toDateInput(from), to: toDateInput(to) };
}

/**
 * `YYYY-MM-DD` بالتوقيت المحلّي.
 *
 * `toISOString().slice(0,10)` يحوّل إلى UTC أولاً، فيقفز يوماً كاملاً للمستخدم
 * شرق غرينتش في ساعات المساء — والمصروف يُسجَّل بيومٍ غير يومه.
 */
export function toDateInput(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * يترجم مدى `YYYY-MM-DD` المختار إلى لحظتين دقيقتين للخادم.
 *
 * التاريخ المجرّد يُفسَّر على الخادم كمنتصف ليل **عالمي**، بينما المصروف يُخزَّن
 * بمنتصف ليل **محلّي**. في القاهرة (+3) يصير مصروف الخامس عشر محفوظاً في
 * 21:00 من الرابع عشر عالمياً — فيسقط خارج `from` ويختفي من نتيجة يومه.
 * أُثبت ذلك حيّاً: بحثٌ بـ`from=to=2026-10-15` لم يُعِد مصروف ذلك اليوم.
 *
 * فالحدّان يُبنيان هنا بتوقيت الجهاز — نفس نهج [dayBounds] في شاشة التسليمات.
 */
export function rangeToParams(
  from?: string,
  to?: string,
): { from?: string; to?: string } {
  const out: { from?: string; to?: string } = {};
  if (from) {
    const start = new Date(`${from}T00:00:00`);
    if (!Number.isNaN(start.getTime())) out.from = start.toISOString();
  }
  if (to) {
    const end = new Date(`${to}T00:00:00`);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      out.to = end.toISOString();
    }
  }
  return out;
}

/** موجب ومحدود — يطابق تحقّق الخادم قبل الرحلة إليه */
export const MAX_EXPENSE_AMOUNT = 10_000_000;

export function isValidAmount(raw: string): boolean {
  const n = Number(raw);
  return raw.trim() !== "" && Number.isFinite(n) && n > 0 && n <= MAX_EXPENSE_AMOUNT;
}
