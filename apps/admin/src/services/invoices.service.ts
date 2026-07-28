import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  CreateInvoiceInput,
  CreateInvoicePaymentInput,
  EmailInvoiceInput,
  InvoiceDetail,
  InvoicePayment,
  ListInvoicePaymentsParams,
  ListInvoicePaymentsResult,
  ListInvoicesParams,
  ListInvoicesResult,
  UpdateInvoiceInput,
} from "@/types/invoice";

function toQueryParams(params: ListInvoicesParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.limit) query.limit = String(params.limit);
  if (params.search) query.search = params.search;
  if (params.status) query.status = params.status;
  if (params.customerId) query.customerId = params.customerId;
  if (params.branchId) query.branchId = params.branchId;
  if (params.orderId) query.orderId = params.orderId;
  if (params.issuedFrom) query.issuedFrom = params.issuedFrom;
  if (params.issuedTo) query.issuedTo = params.issuedTo;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  return query;
}

export async function listInvoices(params: ListInvoicesParams): Promise<ListInvoicesResult> {
  const { data } = await apiClient.get<ApiListResponse<{ invoices: ListInvoicesResult["invoices"] }>>(
    "/invoices",
    { params: toQueryParams(params) },
  );
  return { invoices: data.data.invoices, meta: data.meta };
}

export async function getInvoice(id: string): Promise<InvoiceDetail> {
  const { data } = await apiClient.get<ApiResponse<{ invoice: InvoiceDetail }>>(`/invoices/${id}`);
  return data.data.invoice;
}

/** ينسخ subtotal/discount/items من الطلب بالخادم - العميل يُرسل orderId فقط */
export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceDetail> {
  const { data } = await apiClient.post<ApiResponse<{ invoice: InvoiceDetail }>>("/invoices", input);
  return data.data.invoice;
}

export async function updateInvoice(id: string, input: UpdateInvoiceInput): Promise<InvoiceDetail> {
  const { data } = await apiClient.put<ApiResponse<{ invoice: InvoiceDetail }>>(
    `/invoices/${id}`,
    input,
  );
  return data.data.invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  await apiClient.delete(`/invoices/${id}`);
}

/** GET /invoices/:id/pdf - Blob حقيقي (application/pdf) - عرض مباشر بتبويب جديد بالمستدعي */
export async function getInvoicePdfBlob(id: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/invoices/${id}/pdf`, { responseType: "blob" });
  return response.data;
}

/** GET /invoices/:id/print - Blob (text/html) - عرض مباشر بتبويب جديد بالمستدعي، بلا إعادة بناء Template */
export async function getInvoicePrintBlob(id: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/invoices/${id}/print`, { responseType: "blob" });
  return response.data;
}

/**
 * GET /invoices/:id/download - نفس ملف PDF لكن تنزيل إجباري - بنفس نمط
 * downloadBackup() الموجود مسبقاً (settings.service.ts) حرفياً
 */
export async function downloadInvoice(id: string, invoiceNumber: string): Promise<void> {
  const response = await apiClient.get<Blob>(`/invoices/${id}/download`, { responseType: "blob" });

  const disposition = response.headers["content-disposition"] as string | undefined;
  const filenameMatch = disposition?.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] ?? `${invoiceNumber}.pdf`;

  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** POST /invoices/:id/email - يُرفِق PDF حقيقي بالخادم، لا رد غير success/message */
export async function emailInvoice(id: string, input: EmailInvoiceInput): Promise<void> {
  await apiClient.post<ApiResponse<null>>(`/invoices/${id}/email`, input);
}

// ==================== Payments Integration ====================

function toPaymentsQueryParams(params: ListInvoicePaymentsParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.limit) query.limit = String(params.limit);
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  return query;
}

/** GET /invoices/:id/payments - كل مدفوعات طلب الفاتورة مع ترقيم */
export async function listInvoicePayments(
  id: string,
  params: ListInvoicePaymentsParams,
): Promise<ListInvoicePaymentsResult> {
  const { data } = await apiClient.get<ApiListResponse<{ payments: InvoicePayment[] }>>(
    `/invoices/${id}/payments`,
    { params: toPaymentsQueryParams(params) },
  );
  return { payments: data.data.payments, meta: data.meta };
}

/** POST /invoices/:id/payments - إنشاء دفعة على طلب الفاتورة (السقف = إجمالي الفاتورة) */
export async function createInvoicePayment(
  id: string,
  input: CreateInvoicePaymentInput,
): Promise<InvoicePayment> {
  const { data } = await apiClient.post<ApiResponse<{ payment: InvoicePayment }>>(
    `/invoices/${id}/payments`,
    input,
  );
  return data.data.payment;
}
