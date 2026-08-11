import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  CreateExpenseInput,
  ExpenseRow,
  ExpensesResult,
  ListExpensesParams,
  OperatingSummary,
  OperatingSummaryParams,
  UpdateExpenseInput,
} from "@/types/expenses";

/** يسقط الفارغ حتى لا يُرسل `category=` فيرفضه تحقّق enum في الخادم */
function toParams<T extends object>(params: T): Record<string, string> {
  const q: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q[k] = String(v);
  }
  return q;
}

export async function listExpenses(params: ListExpensesParams): Promise<ExpensesResult> {
  const { data } = await apiClient.get<
    ApiListResponse<{ expenses: ExpenseRow[]; totalAmount: string }>
  >("/expenses", { params: toParams(params) });
  return {
    expenses: data.data.expenses,
    totalAmount: data.data.totalAmount,
    meta: data.meta,
  };
}

export async function getExpense(id: string): Promise<ExpenseRow> {
  const { data } = await apiClient.get<ApiResponse<{ expense: ExpenseRow }>>(`/expenses/${id}`);
  return data.data.expense;
}

export async function createExpense(input: CreateExpenseInput): Promise<ExpenseRow> {
  const { data } = await apiClient.post<ApiResponse<{ expense: ExpenseRow }>>("/expenses", input);
  return data.data.expense;
}

export async function updateExpense(id: string, input: UpdateExpenseInput): Promise<ExpenseRow> {
  const { data } = await apiClient.patch<ApiResponse<{ expense: ExpenseRow }>>(
    `/expenses/${id}`,
    input,
  );
  return data.data.expense;
}

export async function cancelExpense(id: string, reason: string): Promise<ExpenseRow> {
  const { data } = await apiClient.post<ApiResponse<{ expense: ExpenseRow }>>(
    `/expenses/${id}/cancel`,
    { reason },
  );
  return data.data.expense;
}

export async function getOperatingSummary(
  params: OperatingSummaryParams,
): Promise<OperatingSummary> {
  const { data } = await apiClient.get<ApiResponse<{ summary: OperatingSummary }>>(
    "/expenses/summary",
    { params: toParams(params) },
  );
  return data.data.summary;
}
