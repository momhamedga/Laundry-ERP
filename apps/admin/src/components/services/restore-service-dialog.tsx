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
import { useRestoreServiceMutation } from "@/hooks/use-services";
import type { Service } from "@/types/service";

interface RestoreServiceDialogProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RestoreServiceDialog({ service, open, onOpenChange }: RestoreServiceDialogProps) {
  const mutation = useRestoreServiceMutation();

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
          <AlertDialogTitle>استعادة الخدمة؟</AlertDialogTitle>
          <AlertDialogDescription>
            ستصبح خدمة &quot;{service?.name}&quot; نشطة ومتاحة للطلبات الجديدة مجدداً.
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
