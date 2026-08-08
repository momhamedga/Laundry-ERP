import { apiClient } from "@/lib/axios";
import { createPaymentLocally } from "@/lib/offline-payments";
import { route } from "@/lib/offline-router";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  CancelPaymentInput,
  CreatePaymentInput,
  ListPaymentsParams,
  ListPaymentsResult,
  Payment,
  RefundPaymentInput,
} from "@/types/payment";

function toQueryParams(params: ListPaymentsParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.limit) query.limit = String(params.limit);
  if (params.search) query.search = params.search;
  if (params.orderId) query.orderId = params.orderId;
  if (params.method) query.method = params.method;
  if (params.status) query.status = params.status;
  if (params.dateFrom) query.dateFrom = params.dateFrom;
  if (params.dateTo) query.dateTo = params.dateTo;
  if (params.minAmount !== undefined) query.minAmount = String(params.minAmount);
  if (params.maxAmount !== undefined) query.maxAmount = String(params.maxAmount);
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  return query;
}

export async function listPayments(params: ListPaymentsParams): Promise<ListPaymentsResult> {
  const { data } = await apiClient.get<ApiListResponse<{ payments: Payment[] }>>("/payments", {
    params: toQueryParams(params),
  });
  return { payments: data.data.payments, meta: data.meta };
}

export async function getPayment(id: string): Promise<Payment> {
  const { data } = await apiClient.get<ApiResponse<{ payment: Payment }>>(`/payments/${id}`);
  return data.data.payment;
}

/** تسجيل دفعة — يعمل دون اتصال ويُدرَج في طابور المزامنة */
export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  return route({
    label: "payments.create",
    remote: async () => {
      const { data } = await apiClient.post<ApiResponse<{ payment: Payment }>>("/payments", input);
      return data.data.payment;
    },
    local: () => createPaymentLocally(input),
  });
}

/** COMPLETED فقط - يرفضه الخادم لأي حالة أخرى (راجع payments.service.ts refund) */
export async function refundPayment(id: string, input: RefundPaymentInput): Promise<Payment> {
  const { data } = await apiClient.post<ApiResponse<{ payment: Payment }>>(
    `/payments/${id}/refund`,
    input,
  );
  return data.data.payment;
}

/** PENDING فقط - يرفضه الخادم لأي حالة أخرى (COMPLETED يوجّه لاستخدام refund) */
export async function cancelPayment(id: string, input: CancelPaymentInput): Promise<Payment> {
  const { data } = await apiClient.post<ApiResponse<{ payment: Payment }>>(
    `/payments/${id}/cancel`,
    input,
  );
  return data.data.payment;
}

/**
 * GET /payments/:id/receipt - إيصال دفع HTML خام (text/html) للطباعة المباشرة
 * بتبويب جديد، بلا إعادة بناء Template بالواجهة. متاح فقط لدفعة COMPLETED/REFUNDED
 * (يرفضه الخادم بغيرها) - المستدعي يُخفي الزر أصلاً لغير هاتين الحالتين.
 */
export async function getPaymentReceiptHtmlBlob(id: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/payments/${id}/receipt`, { responseType: "blob" });
  return response.data;
}
