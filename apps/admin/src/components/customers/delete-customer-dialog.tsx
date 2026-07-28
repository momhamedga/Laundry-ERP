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
import { useDeleteCustomerMutation } from "@/hooks/use-customers";
import type { Customer } from "@/types/customer";

interface DeleteCustomerDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** تأكيد التعطيل (Soft Delete) - لا حذف فعلي أبداً */
export function DeleteCustomerDialog({ customer, open, onOpenChange }: DeleteCustomerDialogProps) {
  const mutation = useDeleteCustomerMutation();

  async function handleConfirm() {
    if (!customer) return;
    try {
      await mutation.mutateAsync(customer.id);
      onOpenChange(false);
    } catch {
      // toast بالفعل عبر onError - يبقى الحوار مفتوحاً لإعادة المحاولة
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تعطيل العميل؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم تعطيل حساب &quot;{customer?.name}&quot;. يمكنك استعادته لاحقاً في أي وقت.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner className="text-destructive" />}
            تعطيل
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
