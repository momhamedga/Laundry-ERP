"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { expenseKeys } from "@/lib/query-keys";
import * as service from "@/services/expenses.service";
import type {
  CreateExpenseInput,
  ListExpensesParams,
  OperatingSummaryParams,
  UpdateExpenseInput,
} from "@/types/expenses";

export function useExpensesQuery(params: ListExpensesParams) {
  return useQuery({
    queryKey: expenseKeys.list(params),
    queryFn: () => service.listExpenses(params),
    placeholderData: keepPreviousData,
  });
}

export function useExpenseQuery(id: string | null) {
  return useQuery({
    queryKey: expenseKeys.detail(id ?? "none"),
    queryFn: () => service.getExpense(id as string),
    enabled: id !== null,
  });
}

export function useOperatingSummaryQuery(params: OperatingSummaryParams, enabled = true) {
  return useQuery({
    queryKey: expenseKeys.summary(params),
    queryFn: () => service.getOperatingSummary(params),
    enabled: enabled && Boolean(params.from) && Boolean(params.to),
  });
}

/**
 * أي تغيير في مصروف يُبطل الملخّص أيضاً.
 *
 * الملخّص مشتقّ من نفس البيانات، وتركه على ذاكرته يُظهر ناتجاً تشغيلياً لا يطابق
 * الجدول أسفله في الشاشة نفسها.
 */
function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: expenseKeys.all });
  };
}

export function useCreateExpenseMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => service.createExpense(input),
    onSuccess: () => {
      toast.success("تم تسجيل المصروف");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateExpenseMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateExpenseInput }) =>
      service.updateExpense(id, input),
    onSuccess: () => {
      toast.success("تم تحديث المصروف");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useCancelExpenseMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      service.cancelExpense(id, reason),
    onSuccess: () => {
      toast.success("تم إلغاء المصروف");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
