"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, Download, Eye, Mail, Pencil, Printer } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  useInvoiceDownloadMutation,
  useInvoiceEmailMutation,
  useInvoicePdfQuery,
  useInvoicePrintQuery,
} from "@/hooks/use-invoices";
import { usePermissions } from "@/hooks/use-permissions";
import {
  emailInvoiceFormSchema,
  toEmailInvoiceInput,
  type EmailInvoiceFormValues,
} from "@/lib/validations/invoice";
import { openBlobInNewTab } from "@/lib/open-blob";
import type { InvoiceDetail } from "@/types/invoice";
import { DeleteInvoiceDialog } from "./delete-invoice-dialog";
import { EditInvoiceDialog } from "./edit-invoice-dialog";

interface InvoiceActionsProps {
  invoice: InvoiceDetail;
}

/**
 * أزرار إجراءات الفاتورة - عرض PDF/تنزيل/طباعة/بريد/تعديل/حذف. صلاحية لكل
 * زر (invoices:read/print/email/update/delete) + تعطيل حسب الحالة يطابق
 * Business Rules الخادم حرفياً (ensureFinalized يمنع DRAFT، ensureMutable
 * يمنع CANCELLED بالتعديل، لا حذف لفاتورة PAID) - تعطيل استباقي بدل انتظار فشل مضمون
 */
export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const { can } = usePermissions();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const pdfQuery = useInvoicePdfQuery(invoice.id);
  const printQuery = useInvoicePrintQuery(invoice.id);
  const downloadMutation = useInvoiceDownloadMutation();
  const emailMutation = useInvoiceEmailMutation(invoice.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmailInvoiceFormValues>({
    resolver: zodResolver(emailInvoiceFormSchema),
    defaultValues: { email: "" },
  });

  const isDraft = invoice.status === "DRAFT";
  const isCancelled = invoice.status === "CANCELLED";
  const isPaid = invoice.status === "PAID";
  const [pdfLoading, setPdfLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  async function handleViewPdf() {
    setPdfLoading(true);
    try {
      const result = await pdfQuery.refetch();
      if (result.data) await openBlobInNewTab(result.data, false, `${invoice.invoiceNumber ?? "invoice"}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handlePrint() {
    setPrintLoading(true);
    try {
      const result = await printQuery.refetch();
      if (result.data) await openBlobInNewTab(result.data, true, `${invoice.invoiceNumber ?? "invoice"}.pdf`);
    } finally {
      setPrintLoading(false);
    }
  }

  function handleEmailOpenChange(next: boolean) {
    if (!next) reset({ email: "" });
    setEmailOpen(next);
  }

  async function onEmailSubmit(values: EmailInvoiceFormValues) {
    try {
      await emailMutation.mutateAsync(toEmailInvoiceInput(values));
      handleEmailOpenChange(false);
    } catch {
      // toast بالفعل عبر onError الخاص بالـ mutation
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {can("invoices:read") && (
        <Button
          variant="outline"
          size="sm"
          disabled={isDraft || pdfLoading}
          title={isDraft ? "أصدر الفاتورة أولاً قبل عرض PDF" : undefined}
          onClick={() => void handleViewPdf()}
        >
          {pdfLoading ? <Spinner className="size-3.5" /> : <Eye aria-hidden />} عرض PDF
        </Button>
      )}
      {can("invoices:read") && (
        <Button
          variant="outline"
          size="sm"
          disabled={isDraft || downloadMutation.isPending}
          title={isDraft ? "أصدر الفاتورة أولاً قبل التنزيل" : undefined}
          onClick={() =>
            downloadMutation.mutate({ id: invoice.id, invoiceNumber: invoice.invoiceNumber })
          }
        >
          {downloadMutation.isPending ? <Spinner className="size-3.5" /> : <Download aria-hidden />}
          تنزيل
        </Button>
      )}
      {can("invoices:print") && (
        <Button
          variant="outline"
          size="sm"
          disabled={isDraft || printLoading}
          title={isDraft ? "أصدر الفاتورة أولاً قبل الطباعة" : undefined}
          onClick={() => void handlePrint()}
        >
          {printLoading ? <Spinner className="size-3.5" /> : <Printer aria-hidden />} طباعة
        </Button>
      )}
      {can("invoices:email") && (
        <Button
          variant="outline"
          size="sm"
          disabled={isDraft}
          title={isDraft ? "أصدر الفاتورة أولاً قبل الإرسال" : undefined}
          onClick={() => setEmailOpen(true)}
        >
          <Mail aria-hidden /> إرسال بالبريد
        </Button>
      )}
      {can("invoices:update") && (
        <Button
          variant="outline"
          size="sm"
          disabled={isCancelled}
          title={isCancelled ? "الفاتورة ملغاة - لا يمكن تعديلها" : undefined}
          onClick={() => setEditOpen(true)}
        >
          <Pencil aria-hidden /> تعديل
        </Button>
      )}
      {can("invoices:delete") && (
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={isPaid}
          title={isPaid ? "لا يمكن حذف فاتورة مدفوعة بالكامل - ألغِها بدلاً من ذلك" : undefined}
          onClick={() => setDeleteOpen(true)}
        >
          <Ban aria-hidden /> حذف
        </Button>
      )}

      <Dialog open={emailOpen} onOpenChange={handleEmailOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إرسال الفاتورة بالبريد الإلكتروني</DialogTitle>
            <DialogDescription dir="ltr">{invoice.invoiceNumber}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onEmailSubmit)} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invoice-email-address">البريد الإلكتروني *</Label>
              <Input
                id="invoice-email-address"
                type="email"
                dir="ltr"
                placeholder="customer@example.com"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={emailMutation.isPending}>
                {emailMutation.isPending && <Spinner className="text-primary-foreground" />}
                إرسال
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <EditInvoiceDialog invoice={invoice} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteInvoiceDialog invoice={invoice} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}
