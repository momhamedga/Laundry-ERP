import type { PaginationMeta, SortOrder } from "@/types";
import type { OrderStatus } from "@/types/orders";
import type { CreatePaymentStatus, Payment, PaymentMethod } from "@/types/payment";

/**
 * أنواع وحدة الفواتير - مطابقة حرفياً لـ apps/api/src/modules/invoices/
 * (invoice.types.ts + invoice.dto.ts + invoice.validator.ts + invoice.constants.ts)
 * راجع الخادم دائماً قبل أي تعديل هنا - لا حقول مُختلَقة
 */

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";

/** حالات يقبلها التعديل يدوياً فقط - PARTIALLY_PAID/PAID تُشتق تلقائياً بالخادم، لا تُقبل هنا */
export type ManuallySettableInvoiceStatus = "DRAFT" | "ISSUED" | "CANCELLED";

/** حالات يقبلها الإنشاء فقط */
export type CreateInvoiceStatus = "DRAFT" | "ISSUED";

export type InvoiceSortField = "issuedAt" | "dueDate" | "total" | "invoiceNumber" | "createdAt";

// ==================== Rows ====================

export interface InvoiceCustomerSummary {
  id: string;
  name: string;
  phone: string;
}

export interface InvoiceBranchSummary {
  id: string;
  name: string;
}

/** بيانات فرع أوسع بالتفاصيل فقط (address/phone إضافيان) */
export interface InvoiceBranchDetail extends InvoiceBranchSummary {
  address: string | null;
  phone: string | null;
}

export interface InvoiceOrderSummary {
  id: string;
  orderNumber: string;
}

/** بيانات طلب أوسع بالتفاصيل فقط */
export interface InvoiceOrderDetail extends InvoiceOrderSummary {
  status: OrderStatus;
  paidAmount: string;
  total: string;
}

export interface InvoiceUserSummary {
  id: string;
  name: string;
}

/** بند الفاتورة - لقطة (Snapshot) من بند الطلب وقت الإصدار، للقراءة فقط */
export interface InvoiceItem {
  id: string;
  serviceNameSnapshot: string;
  quantity: string;
  unitPrice: string;
  total: string;
  createdAt: string;
  invoiceId: string;
  serviceId: string;
}

/** صف الفاتورة بالقائمة - GET /invoices */
export interface InvoiceListRow {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paidAmount: string;
  remainingAmount: string;
  notes: string | null;
  issuedAt: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  orderId: string;
  customerId: string;
  branchId: string;
  createdById: string;
  updatedById: string | null;
  customer: InvoiceCustomerSummary;
  branch: InvoiceBranchSummary;
  order: InvoiceOrderSummary;
  _count: { items: number };
}

/** تفاصيل الفاتورة الكاملة - GET /invoices/:id */
export interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paidAmount: string;
  remainingAmount: string;
  notes: string | null;
  issuedAt: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  orderId: string;
  customerId: string;
  branchId: string;
  createdById: string;
  updatedById: string | null;
  customer: InvoiceCustomerSummary;
  branch: InvoiceBranchDetail;
  order: InvoiceOrderDetail;
  createdBy: InvoiceUserSummary;
  updatedBy: InvoiceUserSummary | null;
  items: InvoiceItem[];
}

// ==================== Params ====================

export interface ListInvoicesParams {
  page?: number;
  limit?: number;
  /** بحث برقم الفاتورة أو اسم/هاتف العميل */
  search?: string;
  status?: InvoiceStatus;
  customerId?: string;
  branchId?: string;
  orderId?: string;
  /** yyyy-mm-dd */
  issuedFrom?: string;
  issuedTo?: string;
  sortBy?: InvoiceSortField;
  sortOrder?: SortOrder;
}

export interface ListInvoicesResult {
  invoices: InvoiceListRow[];
  meta: PaginationMeta;
}

/**
 * Payload لـ POST /invoices - orderId فقط مصدر البيانات الحقيقي؛
 * subtotal/discount/items تُنسَخ من الطلب بالخادم (لا تُرسَل من العميل إطلاقاً)
 */
export interface CreateInvoiceInput {
  orderId: string;
  status?: CreateInvoiceStatus;
  tax?: number;
  dueDate?: string;
  notes?: string | null;
}

/** Payload لـ PUT /invoices/:id - كل الحقول اختيارية */
export interface UpdateInvoiceInput {
  status?: ManuallySettableInvoiceStatus;
  tax?: number;
  dueDate?: string | null;
  notes?: string | null;
}

/** Payload لـ POST /invoices/:id/email */
export interface EmailInvoiceInput {
  email: string;
}

// ==================== Payments Integration ====================

/** صف دفعة الفاتورة - نفس Payment القادم من وحدة payments (مُعاد استخدامه) */
export type InvoicePayment = Payment;

export interface ListInvoicePaymentsParams {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "amount";
  sortOrder?: SortOrder;
}

export interface ListInvoicePaymentsResult {
  payments: InvoicePayment[];
  meta: PaginationMeta;
}

/**
 * Payload لـ POST /invoices/:id/payments - نفس دفعة payments بلا orderId
 * (يُشتق من طلب الفاتورة بالخادم)، السقف = إجمالي الفاتورة (بالضريبة)
 */
export interface CreateInvoicePaymentInput {
  amount: number;
  method: PaymentMethod;
  status?: CreatePaymentStatus;
  reference: string | null;
  notes: string | null;
}
