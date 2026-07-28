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
import { useDeleteServiceMutation } from "@/hooks/use-services";
import type { Service } from "@/types/service";

interface DeleteServiceDialogProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** تعطيل الخدمة (Soft Delete) - لا حذف فعلي أبداً */
export function DeleteServiceDialog({ service, open, onOpenChange }: DeleteServiceDialogProps) {
  const mutation = useDeleteServiceMutation();

  async function handleConfirm() {
    if (!service) return;
    try {
      await mutation.mutateAsync(service.id);
      onOpenChange(false);
    } catch {
      // toast بالفعل عبر onError
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تعطيل الخدمة؟</AlertDialogTitle>
          <AlertDialogDescription>
            ستصبح خدمة &quot;{service?.name}&quot; غير متاحة للطلبات الجديدة. يمكنك استعادتها
            لاحقاً في أي وقت.
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
