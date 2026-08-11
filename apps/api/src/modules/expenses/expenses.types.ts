import type { Expense, ExpenseCategory, ExpenseStatus } from "@prisma/client";

/** المصروف كما يُعاد للعميل - مع الفرع والمنشئ للعرض بلا استعلام إضافي */
export interface ExpenseRow extends Expense {
  branch: { id: string; name: string };
  createdBy: { id: string; name: string };
  cancelledBy: { id: string; name: string } | null;
}

export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * نتيجة القائمة مع إجماليّ الفلاتر.
 *
 * `totalAmount` محسوب على **كل** ما تطابق الفلاتر لا على الصفحة المعروضة:
 * جمع الصفحة وتسميته «إجمالي المصروفات» رقمٌ مضلِّل — يتغيّر بتغيير حجم الصفحة
 * ويُقرأ كأنه إجمالي الفترة. الحساب في قاعدة البيانات لا في المتصفّح.
 */
export interface ListExpensesResult {
  expenses: ExpenseRow[];
  meta: PaginationMeta;
  totalAmount: string;
}

/** ملخّص التشغيل لفترة - إيراد ومصروف وناتج */
export interface OperatingSummary {
  from: string;
  to: string;
  branchId: string | null;
  /** صافي المدفوعات المحصّلة (المبلغ ناقص المسترد) - نفس تعريف لوحة التحكم */
  revenue: string;
  /** مجموع المصروفات النشطة (الملغاة مستبعدة) */
  expenses: string;
  /**
   * الإيراد ناقص المصروفات المسجَّلة.
   *
   * ليس «صافي ربح»: لا يشمل ضرائب ولا التزامات رواتب غير مسجَّلة كمصروف ولا
   * إهلاكاً. تسميته ربحاً تجعل صاحب المغسلة يبني قراراً على رقم ناقص.
   */
  operatingResult: string;
}

export type { Expense, ExpenseCategory, ExpenseStatus };
