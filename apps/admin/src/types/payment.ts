import type { PaginationMeta, SortOrder } from "@/types";
import type { PaymentStatus as OrderPaymentStatus } from "@/types/orders";

export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "MOBILE_WALLET";

/** حالة الدفعة الواحدة - منفصلة عن OrderPaymentStatus (حالة الطلب المشتقة من مجموع دفعاته) */
export type PaymentTxStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED";

export type PaymentSortField = "createdAt" | "amount";

export interface PaymentOrderSummary {
  id: string;
  orderNumber: string;
  total: string;
  paidAmount: string;
  paymentStatus: OrderPaymentStatus;
  customer: { id: string; name: string; phone: string };
}

export interface PaymentReceivedBySummary {
  id: string;
  name: string;
}

/** الدفعة كما يعيدها الخادم - المبالغ Decimal تصل كنص (Prisma.Decimal.toJSON) */
export interface Payment {
  id: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentTxStatus;
  refundedAmount: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  orderId: string;
  order: PaymentOrderSummary;
  receivedById: string;
  receivedBy: PaymentReceivedBySummary;
}

export interface ListPaymentsParams {
  page?: number;
  limit?: number;
  /** بحث بالمرجع أو رقم الطلب أو اسم العميل (يطابق سلوك الخادم) */
  search?: string;
  orderId?: string;
  method?: PaymentMethod;
  status?: PaymentTxStatus;
  /** yyyy-mm-dd */
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: PaymentSortField;
  sortOrder?: SortOrder;
}

export interface ListPaymentsResult {
  payments: Payment[];
  meta: PaginationMeta;
}

/** createPaymentSchema بالخادم يقبل PENDING أو COMPLETED فقط عند الإنشاء (افتراضي COMPLETED) */
export type CreatePaymentStatus = "PENDING" | "COMPLETED";

/** Payload لـ POST /payments - السعر لا يُحسب هنا */
export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status?: CreatePaymentStatus;
  reference: string | null;
  notes: string | null;
}

/**
 * Payload لـ POST /payments/:id/refund - amount غائب = استرداد كامل المتبقي.
 * ملاحظة: reason هو نفس الحقل الذي يُحفظ كـ notes الدفعة بالخادم (راجع
 * payments.service.ts refund()) - لا حقل notes منفصل بهذا المسار
 */
export interface RefundPaymentInput {
  amount?: number;
  reason?: string | null;
}

/** Payload لـ POST /payments/:id/cancel - للدفعات PENDING فقط */
export interface CancelPaymentInput {
  reason?: string | null;
}
