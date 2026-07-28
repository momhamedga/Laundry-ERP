"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { orderKeys } from "@/lib/query-keys";
import * as paymentsService from "@/services/payments.service";
import type {
  CancelPaymentInput,
  CreatePaymentInput,
  ListPaymentsParams,
  RefundPaymentInput,
} from "@/types/payment";

export const paymentKeys = {
  all: ["payments"] as const,
  lists: () => [...paymentKeys.all, "list"] as const,
  list: (params: ListPaymentsParams) => [...paymentKeys.lists(), params] as const,
  details: () => [...paymentKeys.all, "detail"] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
};

export function usePaymentsQuery(params: ListPaymentsParams) {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => paymentsService.listPayments(params),
    placeholderData: keepPreviousData, // ترقيم سلس بلا وميض بين الصفحات
  });
}

export function usePaymentDetailQuery(id: string | null) {
  return useQuery({
    queryKey: paymentKeys.detail(id ?? ""),
    queryFn: () => paymentsService.getPayment(id as string),
    enabled: !!id,
  });
}

/** إيصال الدفع (HTML) - enabled:false، يُشغَّل عند الطلب فقط عبر refetch() من زر الطباعة */
export function usePaymentReceiptQuery(id: string) {
  return useQuery({
    queryKey: [...paymentKeys.detail(id), "receipt"] as const,
    queryFn: () => paymentsService.getPaymentReceiptHtmlBlob(id),
    enabled: false,
    staleTime: 0,
    gcTime: 0,
  });
}

/**
 * كل دفعة تُغيّر paidAmount/paymentStatus بالطلب المرتبط بها (يُعاد حسابهما
 * بالخادم ذرياً) - نُبطل استعلامات الطلب أيضاً حتى لا تبقى تفاصيله قديمة
 * إن فُتحت لاحقاً (orderKeys من lib/query-keys.ts الموجود، بلا تعديل Orders UI)
 */
function invalidatePaymentAndOrder(
  queryClient: ReturnType<typeof useQueryClient>,
  paymentId: string | undefined,
  orderId: string,
) {
  void queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
  if (paymentId) void queryClient.invalidateQueries({ queryKey: paymentKeys.detail(paymentId) });
  void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
  void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
}

export function useCreatePaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentInput) => paymentsService.createPayment(input),
    onSuccess: (payment) => {
      invalidatePaymentAndOrder(queryClient, undefined, payment.orderId);
      toast.success("تم تسجيل الدفعة بنجاح");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useRefundPaymentMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RefundPaymentInput) => paymentsService.refundPayment(id, input),
    onSuccess: (payment) => {
      invalidatePaymentAndOrder(queryClient, id, payment.orderId);
      toast.success("تم استرداد الدفعة بنجاح");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useCancelPaymentMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CancelPaymentInput) => paymentsService.cancelPayment(id, input),
    onSuccess: (payment) => {
      invalidatePaymentAndOrder(queryClient, id, payment.orderId);
      toast.success("تم إلغاء الدفعة");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}
