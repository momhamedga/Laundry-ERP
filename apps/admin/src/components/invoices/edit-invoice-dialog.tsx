"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useUpdateInvoiceMutation } from "@/hooks/use-invoices";
import {
  toUpdateInvoiceInput,
  updateInvoiceFormSchema,
  type UpdateInvoiceFormValues,
} from "@/lib/validations/invoice";
import type { InvoiceDetail, ManuallySettableInvoiceStatus } from "@/types/invoice";
import { InvoiceForm } from "./invoice-form";

interface EditInvoiceDialogProps {
  invoice: InvoiceDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toFormValues(invoice: InvoiceDetail | null): UpdateInvoiceFormValues {
  return {
    status: (invoice?.status === "PARTIALLY_PAID" || invoice?.status === "PAID"
      ? "ISSUED"
      : (invoice?.status ?? "DRAFT")) as ManuallySettableInvoiceStatus,
    tax: invoice?.tax ?? "0",
    dueDate: invoice?.dueDate ? invoice.dueDate.slice(0, 10) : "",
    notes: invoice?.notes ?? "",
  };
}

/**
 * حوار تعديل الفاتورة - يتطلب invoices:update (يُتحقق بالمستدعي).
 * لا orderId هنا - غير قابل للتعديل بالخادم. PARTIALLY_PAID/PAID تُعرَضان
 * كحالة حالية فقط (Badge بالرأس) - الخيار المُعاد للنموذج ISSUED لأنها
 * الحالة اليدوية المُشتقة منها فعلياً، ولا يُقبل تعيينهما يدوياً بالخادم أصلاً
 */
export function EditInvoiceDialog({ invoice, open, onOpenChange }: EditInvoiceDialogProps) {
  const mutation = useUpdateInvoiceMutation(invoice?.id ?? "");
  const hasPayments = invoice ? Number(invoice.paidAmount) > 0 : false;

  const STATUS_OPTIONS: { value: ManuallySettableInvoiceStatus; label: string; disabled?: boolean }[] = [
    { value: "DRAFT", label: "مسودة (غير نهائية)", disabled: hasPayments && invoice?.status !== "DRAFT" },
    { value: "ISSUED", label: "صادرة (نهائية)" },
    { value: "CANCELLED", label: "ملغاة" },
  ];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateInvoiceFormValues>({
    resolver: zodResolver(updateInvoiceFormSchema),
    values: toFormValues(invoice),
    defaultValues: toFormValues(invoice),
  });

  function handleOpenChange(next: boolean) {
    if (!next) reset(toFormValues(invoice));
    onOpenChange(next);
  }

  async function onSubmit(values: UpdateInvoiceFormValues) {
    try {
      await mutation.mutateAsync(toUpdateInvoiceInput(values));
      handleOpenChange(false);
    } catch {
      // toast بالفعل عبر onError الخاص بالـ mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل الفاتورة</DialogTitle>
          <DialogDescription dir="ltr">{invoice?.invoiceNumber}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label>الطلب</Label>
            <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm" dir="ltr">
              {invoice?.order.orderNumber}
            </p>
          </div>

          <InvoiceForm
            statusValue={watch("status")}
            onStatusChange={(v) => setValue("status", v as ManuallySettableInvoiceStatus)}
            statusOptions={STATUS_OPTIONS}
            taxRegister={register("tax")}
            taxError={errors.tax?.message}
            dueDateRegister={register("dueDate")}
            notesRegister={register("notes")}
            notesError={errors.notes?.message}
          />
          {hasPayments && invoice?.status !== "DRAFT" && (
            <p className="text-xs text-muted-foreground">
              لا يمكن إعادة الفاتورة لحالة مسودة - عليها مدفوعات مسجَّلة بالفعل.
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="text-primary-foreground" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
