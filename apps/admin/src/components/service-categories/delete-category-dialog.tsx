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
import { useDeleteCategoryMutation } from "@/hooks/use-service-categories";
import type { CategoryWithCount } from "@/types/service-category";

interface DeleteCategoryDialogProps {
  category: CategoryWithCount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** حذف نهائي - Business Rule: لا يُسمح به إذا كان التصنيف يحتوي خدمات (409 من الخادم) */
export function DeleteCategoryDialog({ category, open, onOpenChange }: DeleteCategoryDialogProps) {
  const mutation = useDeleteCategoryMutation();

  async function handleConfirm() {
    if (!category) return;
    try {
      await mutation.mutateAsync(category.id);
      onOpenChange(false);
    } catch {
      // toast بالفعل عبر onError (رسالة الخادم مثل "يحتوي على N خدمة")
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف التصنيف نهائياً؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيُحذف تصنيف &quot;{category?.name}&quot; نهائياً ولا يمكن التراجع. هذا الإجراء
            متاح فقط للتصنيفات الفارغة من الخدمات.
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
            حذف نهائي
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
