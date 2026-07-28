"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { invoiceKeys, orderKeys } from "@/lib/query-keys";
import { paymentKeys } from "@/hooks/use-payments";
import * as invoicesService from "@/services/invoices.service";
import type {
  CreateInvoiceInput,
  CreateInvoicePaymentInput,
  EmailInvoiceInput,
  ListInvoicePaymentsParams,
  ListInvoicesParams,
  UpdateInvoiceInput,
} from "@/types/invoice";

/** استجابات PDF/Print/Download تصل كـBlob حتى عند الفشل - getErrorMessage العام لا يقرأها (نفس حل use-settings.ts لتنزيل النسخة الاحتياطية) */
async function getBlobErrorMessage(error: unknown): Promise<string> {
  if (error instanceof AxiosError && error.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text();
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      // تعذّر التحليل - يُستخدم المسار العام أدناه
    }
  }
  return getErrorMessage(error);
}

// ==================== Read ====================

export function useInvoicesQuery(params: ListInvoicesParams) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => invoicesService.listInvoices(params),
    placeholderData: keepPreviousData,
  });
}

export function useInvoiceQuery(id: string | null) {
  return useQuery({
    queryKey: invoiceKeys.detail(id ?? ""),
    queryFn: () => invoicesService.getInvoice(id as string),
    enabled: !!id,
  });
}

// ==================== Write ====================

function useInvalidateInvoices() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    if (id) void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
  };
}

export function useCreateInvoiceMutation() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => invoicesService.createInvoice(input),
    onSuccess: (invoice) => {
      invalidate();
      toast.success(`تم إنشاء الفاتورة ${invoice.invoiceNumber} بنجاح`);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateInvoiceMutation(id: string) {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (input: UpdateInvoiceInput) => invoicesService.updateInvoice(id, input),
    onSuccess: () => {
      invalidate(id);
      toast.success("تم تحديث الفاتورة بنجاح");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteInvoiceMutation() {
  const invalidate = useInvalidateInvoices();
  return useMutation({
    mutationFn: (id: string) => invoicesService.deleteInvoice(id),
    onSuccess: () => {
      invalidate();
      toast.success("تم حذف الفاتورة");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

// ==================== Documents ====================

/** enabled:false عمداً - يُشغَّل عند الطلب فقط عبر refetch() من زر "عرض PDF" */
export function useInvoicePdfQuery(id: string) {
  return useQuery({
    queryKey: [...invoiceKeys.detail(id), "pdf"] as const,
    queryFn: () => invoicesService.getInvoicePdfBlob(id),
    enabled: false,
    staleTime: 0,
    gcTime: 0,
  });
}

/** enabled:false عمداً - يُشغَّل عند الطلب فقط عبر refetch() من زر "طباعة" */
export function useInvoicePrintQuery(id: string) {
  return useQuery({
    queryKey: [...invoiceKeys.detail(id), "print"] as const,
    queryFn: () => invoicesService.getInvoicePrintBlob(id),
    enabled: false,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useInvoiceDownloadMutation() {
  return useMutation({
    mutationFn: ({ id, invoiceNumber }: { id: string; invoiceNumber: string }) =>
      invoicesService.downloadInvoice(id, invoiceNumber),
    onError: (error: unknown) => {
      void getBlobErrorMessage(error).then((message) => toast.error(message));
    },
  });
}

export function useInvoiceEmailMutation(id: string) {
  return useMutation({
    mutationFn: (input: EmailInvoiceInput) => invoicesService.emailInvoice(id, input),
    onSuccess: () => toast.success("تم إرسال الفاتورة بالبريد الإلكتروني بنجاح"),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

// ==================== Payments Integration ====================

export function useInvoicePaymentsQuery(id: string, params: ListInvoicePaymentsParams) {
  return useQuery({
    queryKey: invoiceKeys.payments(id, params),
    queryFn: () => invoicesService.listInvoicePayments(id, params),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}

/**
 * كل دفعة تُغيّر paidAmount/status بالفاتورة والطلب معاً (يُعاد حسابها ذرياً
 * بالخادم) - نُبطل استعلامات الفاتورة (تفاصيل+قوائم+مدفوعاتها) والمدفوعات
 * والطلبات حتى تنعكس الأرقام فوراً بلا Refresh (Business Rule النقطة 9)
 */
export function useCreateInvoicePaymentMutation(invoiceId: string, orderId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvoicePaymentInput) =>
      invoicesService.createInvoicePayment(invoiceId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      if (orderId) void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      toast.success("تم تسجيل الدفعة بنجاح");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}
