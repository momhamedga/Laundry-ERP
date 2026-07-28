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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { METHOD_LABELS } from "@/components/payments/payment-method-badge";
import { useCreateInvoicePaymentMutation } from "@/hooks/use-invoices";
import { formatCurrency } from "@/lib/format";
import {
  receiveInvoicePaymentFormSchema,
  toCreateInvoicePaymentInput,
  type ReceiveInvoicePaymentFormValues,
} from "@/lib/validations/invoice";
import type { CreatePaymentStatus, PaymentMethod } from "@/types/payment";

interface ReceivePaymentDialogProps {
  invoiceId: string;
  orderId: string;
  /** المتبقّي على الفاتورة (بالضريبة) - يُعرض كإرشاد فقط، السقف الحقيقي بالخادم */
  remaining: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const METHODS: readonly PaymentMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET"];

const STATUS_OPTIONS: { value: CreatePaymentStatus; label: string }[] = [
  { value: "COMPLETED", label: "مكتملة (تم الاستلام فعلياً)" },
  { value: "PENDING", label: "قيد الانتظار (بانتظار تأكيد التحويل مثلاً)" },
];

const EMPTY_VALUES: ReceiveInvoicePaymentFormValues = {
  method: "CASH",
  status: "COMPLETED",
  amount: "",
  reference: "",
  notes: "",
};

/**
 * حوار تسجيل دفعة على الفاتورة - POST /invoices/:id/payments. الطلب ثابت
 * (طلب الفاتورة)، السقف = إجمالي الفاتورة بالخادم. عند النجاح يُبطِل الـHook
 * استعلامات الفاتورة والمدفوعات والطلب فيتحدّث كل شيء بلا Refresh.
 */
export function ReceivePaymentDialog({
  invoiceId,
  orderId,
  remaining,
  open,
  onOpenChange,
}: ReceivePaymentDialogProps) {
  const mutation = useCreateInvoicePaymentMutation(invoiceId, orderId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReceiveInvoicePaymentFormValues>({
    resolver: zodResolver(receiveInvoicePaymentFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  function handleOpenChange(next: boolean) {
    if (!next) reset(EMPTY_VALUES);
    onOpenChange(next);
  }

  async function onSubmit(values: ReceiveInvoicePaymentFormValues) {
    try {
      await mutation.mutateAsync(toCreateInvoicePaymentInput(values));
      handleOpenChange(false);
    } catch {
      // toast بالفعل عبر onError الخاص بالـ mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل دفعة على الفاتورة</DialogTitle>
          <DialogDescription>المتبقّي على الفاتورة: {formatCurrency(remaining)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="receive-payment-method">طريقة الدفع *</Label>
            <Select
              value={watch("method")}
              onValueChange={(v) => setValue("method", (v as PaymentMethod) ?? "CASH")}
              items={METHOD_LABELS}
            >
              <SelectTrigger id="receive-payment-method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receive-payment-status">حالة الدفعة *</Label>
            <Select
              value={watch("status")}
              onValueChange={(v) => setValue("status", (v as CreatePaymentStatus) ?? "COMPLETED")}
              items={Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s.label]))}
            >
              <SelectTrigger id="receive-payment-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receive-payment-amount">المبلغ *</Label>
            <Input
              id="receive-payment-amount"
              type="number"
              min="0"
              step="0.01"
              dir="ltr"
              aria-invalid={!!errors.amount}
              {...register("amount")}
            />
            {errors.amount && (
              <p role="alert" className="text-xs text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receive-payment-reference">المرجع</Label>
            <Input
              id="receive-payment-reference"
              dir="ltr"
              aria-invalid={!!errors.reference}
              {...register("reference")}
            />
            {errors.reference && (
              <p role="alert" className="text-xs text-destructive">
                {errors.reference.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receive-payment-notes">ملاحظات</Label>
            <Textarea id="receive-payment-notes" rows={3} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="text-primary-foreground" />}
              تسجيل الدفعة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
