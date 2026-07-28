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
import { useRestoreCustomerMutation } from "@/hooks/use-customers";
import type { Customer } from "@/types/customer";

interface RestoreCustomerDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RestoreCustomerDialog({
  customer,
  open,
  onOpenChange,
}: RestoreCustomerDialogProps) {
  const mutation = useRestoreCustomerMutation();

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
          <AlertDialogTitle>استعادة العميل؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيصبح حساب &quot;{customer?.name}&quot; نشطاً مجدداً ومتاحاً لإنشاء طلبات جديدة.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleConfirm()} disabled={mutation.isPending}>
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            استعادة
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
