import type { Prisma } from "@prisma/client";
import type { PaymentRow } from "../payments/index.js";

/** بيانات الترقيم الموحدة في meta */
export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** نتيجة قائمة مدفوعات الفاتورة - PaymentRow مُعاد استخدامه من وحدة payments */
export interface ListInvoicePaymentsResult {
  payments: PaymentRow[];
  meta: PaginationMeta;
}

// ==================== Prisma Include Shapes ====================
// أشكال include ثابتة → أنواع مشتقة تلقائياً - لا N+1 (join واحد)

export const INVOICE_LIST_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  branch: { select: { id: true, name: true } },
  order: { select: { id: true, orderNumber: true } },
  _count: { select: { items: true } },
} satisfies Prisma.InvoiceInclude;

export const INVOICE_DETAIL_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  /** address/phone إضافيان لعرض "بيانات الفرع" بمستند PDF/Print - إضافة غير كاسرة لواجهة JSON الحالية */
  branch: { select: { id: true, name: true, address: true, phone: true } },
  order: { select: { id: true, orderNumber: true, status: true, paidAmount: true, total: true } },
  createdBy: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, name: true } },
  items: true,
} satisfies Prisma.InvoiceInclude;

export type InvoiceListRow = Prisma.InvoiceGetPayload<{
  include: typeof INVOICE_LIST_INCLUDE;
}>;

export type InvoiceDetail = Prisma.InvoiceGetPayload<{
  include: typeof INVOICE_DETAIL_INCLUDE;
}>;

export interface ListInvoicesResult {
  invoices: InvoiceListRow[];
  meta: PaginationMeta;
}

// ==================== Computation ====================

/** بند فاتورة منسوخ من بند طلب - Snapshot وقت الإصدار */
export interface InvoiceItemSnapshot {
  serviceId: string;
  serviceNameSnapshot: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  total: Prisma.Decimal;
}

/** الإجماليات المحسوبة بالخادم فقط عند الإصدار */
export interface InvoiceTotals {
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  tax: Prisma.Decimal;
  total: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  remainingAmount: Prisma.Decimal;
  items: InvoiceItemSnapshot[];
}
