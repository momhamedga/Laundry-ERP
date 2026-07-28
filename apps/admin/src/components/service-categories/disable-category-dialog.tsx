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
import { useChangeCategoryStatusMutation } from "@/hooks/use-service-categories";
import type { CategoryWithCount } from "@/types/service-category";

interface DisableCategoryDialogProps {
  category: CategoryWithCount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * تأكيد التعطيل فقط - التفعيل إجراء فوري بلا تأكيد (آمن وقابل للتراجع بضغطة واحدة)
 * Business Rule: تعطيل التصنيف يجعل كل خدماته تظهر كغير متاحة
 */
export function DisableCategoryDialog({
  category,
  open,
  onOpenChange,
}: DisableCategoryDialogProps) {
  const mutation = useChangeCategoryStatusMutation();

  async function handleConfirm() {
    if (!category) return;
    try {
      await mutation.mutateAsync({ id: category.id, isActive: false });
      onOpenChange(false);
    } catch {
      // toast بالفعل عبر onError
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تعطيل التصنيف؟</AlertDialogTitle>
          <AlertDialogDescription>
            ستصبح كل خدمات &quot;{category?.name}&quot; ({category?.servicesCount ?? 0}) غير
            متاحة للطلبات الجديدة حتى إعادة التفعيل.
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
