import type { PaginationMeta } from "@/types";

export const EXPENSE_CATEGORIES = [
  "RENT",
  "ELECTRICITY",
  "WATER",
  "SALARIES",
  "DETERGENTS",
  "MAINTENANCE",
  "TRANSPORTATION",
  "SUPPLIES",
  "OTHER",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_STATUSES = ["ACTIVE", "CANCELLED"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

/** مرجع مختصر لمستخدم - كما تُعيده الواجهة الخلفية في include */
export interface ExpenseUserRef {
  id: string;
  name: string;
}

export interface ExpenseRow {
  id: string;
  /** المبالغ نصّية: Decimal لا يُمثَّل في JSON بلا فقدان دقّة */
  amount: string;
  category: ExpenseCategory;
  status: ExpenseStatus;
  notes: string | null;
  expenseDate: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  branchId: string;
  branch: { id: string; name: string };
  createdById: string;
  createdBy: ExpenseUserRef;
  cancelledById: string | null;
  cancelledBy: ExpenseUserRef | null;
}

export interface ExpensesResult {
  expenses: ExpenseRow[];
  /** إجمالي المصروفات النشطة لكامل نتيجة المرشّح لا للصفحة الحالية */
  totalAmount: string;
  meta: PaginationMeta;
}

export interface ListExpensesParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: ExpenseCategory;
  status?: ExpenseStatus;
  branchId?: string;
  from?: string;
  to?: string;
  sortBy?: "expenseDate" | "amount" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface CreateExpenseInput {
  amount: number;
  category: ExpenseCategory;
  branchId: string;
  expenseDate: string;
  notes?: string;
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

export interface OperatingSummary {
  from: string;
  to: string;
  branchId: string | null;
  revenue: string;
  expenses: string;
  /** ناتج تشغيلي لا صافي ربح - لا ضرائب ولا إهلاك */
  operatingResult: string;
}

export interface OperatingSummaryParams {
  from: string;
  to: string;
  branchId?: string;
}
