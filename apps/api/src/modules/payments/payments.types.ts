import type { Prisma } from "@prisma/client";

/** بيانات الترقيم الموحدة في meta */
export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ==================== Prisma Include Shapes ====================
// include ثابت → أنواع مشتقة - لا N+1 (join واحد)

export const PAYMENT_INCLUDE = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      total: true,
      paidAmount: true,
      paymentStatus: true,
      status: true,
      customer: { select: { id: true, name: true, phone: true } },
    },
  },
  receivedBy: { select: { id: true, name: true } },
} satisfies Prisma.PaymentInclude;

export type PaymentRow = Prisma.PaymentGetPayload<{
  include: typeof PAYMENT_INCLUDE;
}>;

export interface ListPaymentsResult {
  payments: PaymentRow[];
  meta: PaginationMeta;
}

// ==================== Computation ====================

/** مجاميع مدفوعات الطلب - تُقرأ داخل الـ Transaction */
export interface OrderPaymentSums {
  /** صافي المحصل: COMPLETED/REFUNDED (المبلغ - المسترد) */
  paidNet: Prisma.Decimal;
  /** المعلق: PENDING (يُحتسب ضد سقف الطلب) */
  pendingSum: Prisma.Decimal;
  /** إجمالي المسترد */
  refundedSum: Prisma.Decimal;
}
