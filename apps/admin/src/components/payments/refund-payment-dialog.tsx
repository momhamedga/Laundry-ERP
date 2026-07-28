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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useRefundPaymentMutation } from "@/hooks/use-payments";
import { formatCurrency } from "@/lib/format";
import {
  buildRefundFormSchema,
  toRefundPaymentInput,
  type RefundFormValues,
} from "@/lib/validations/payment";
import type { Payment } from "@/types/payment";

interface RefundPaymentDialogProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_VALUES: RefundFormValues = { amount: "", reason: "" };

/**
 * حوار استرداد دفعة - يتطلب ADMIN/MANAGER (requireRole بالخادم، لا صلاحية
 * منفصلة). متاح فقط لدفعة COMPLETED (يُتحقق قبل العرض بالمستدعي).
 * amount فارغ = استرداد المتبقي بالكامل؛ Business Rule: Refund Amount <=
 * المتبقي القابل للاسترداد - تحقق أولي هنا، والمصدر الحقيقي يبقى الخادم
 */
export function RefundPaymentDialog({ payment, open, onOpenChange }: RefundPaymentDialogProps) {
  const mutation = useRefundPaymentMutation(payment?.id ?? "");
  const remaining = payment ? Number(payment.amount) - Number(payment.refundedAmount) : 0;
  const schema = buildRefundFormSchema(remaining);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RefundFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  function handleOpenChange(next: boolean) {
    if (!next) reset(EMPTY_VALUES);
    onOpenChange(next);
  }

  async function onSubmit(values: RefundFormValues) {
    try {
      await mutation.mutateAsync(toRefundPaymentInput(values));
      handleOpenChange(false);
    } catch {
      // toast بالفعل عبر onError الخاص بالـ mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>استرداد الدفعة</DialogTitle>
          <DialogDescription dir="ltr">{payment?.reference ?? payment?.id}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="refund-payment-amount">
              المبلغ (اختياري - فارغ = استرداد كامل المتبقي)
            </Label>
            <Input
              id="refund-payment-amount"
              type="number"
              min="0"
              step="0.01"
              dir="ltr"
              placeholder={formatCurrency(remaining)}
              aria-invalid={!!errors.amount}
              {...register("amount")}
            />
            <p className="text-xs text-muted-foreground">
              الحد الأقصى القابل للاسترداد: {formatCurrency(remaining)}
            </p>
            {errors.amount && (
              <p role="alert" className="text-xs text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="refund-payment-reason">السبب (يُحفظ كملاحظة الدفعة)</Label>
            <Textarea id="refund-payment-reason" rows={3} {...register("reason")} />
            {errors.reason && (
              <p role="alert" className="text-xs text-destructive">
                {errors.reason.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="text-destructive" />}
              استرداد
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
