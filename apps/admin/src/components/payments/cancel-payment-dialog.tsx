"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useCancelPaymentMutation } from "@/hooks/use-payments";
import { formatCurrency } from "@/lib/format";
import type { Payment } from "@/types/payment";
import { METHOD_LABELS } from "./payment-method-badge";

interface CancelPaymentDialogProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * تأكيد إلغاء دفعة - يتطلب ADMIN/MANAGER (requireRole بالخادم). متاح فقط
 * لدفعة PENDING (يُتحقق قبل العرض بالمستدعي؛ COMPLETED يوجّهه الخادم
 * لاستخدام الاسترداد بدلاً من الإلغاء). عرض فقط + زر إلغاء - بلا حقل سبب
 */
export function CancelPaymentDialog({ payment, open, onOpenChange }: CancelPaymentDialogProps) {
  const mutation = useCancelPaymentMutation(payment?.id ?? "");

  async function handleConfirm() {
    if (!payment) return;
    try {
      await mutation.mutateAsync({});
      onOpenChange(false);
    } catch {
      // toast بالفعل عبر onError - يبقى الحوار مفتوحاً لإعادة المحاولة
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>إلغاء الدفعة؟</AlertDialogTitle>
          <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
        </AlertDialogHeader>

        <dl className="w-full space-y-1.5 rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">المرجع</dt>
            <dd dir="ltr" className="font-medium">
              {payment?.reference ?? payment?.id.slice(0, 10)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">المبلغ</dt>
            <dd className="font-medium">{payment ? formatCurrency(payment.amount) : "—"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">الطريقة</dt>
            <dd className="font-medium">{payment ? METHOD_LABELS[payment.method] : "—"}</dd>
          </div>
        </dl>

        <AlertDialogFooter>
          <AlertDialogCancel>تراجع</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner className="text-destructive" />}
            إلغاء الدفعة
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
