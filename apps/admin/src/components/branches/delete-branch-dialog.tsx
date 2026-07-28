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
import { useDeleteBranchMutation } from "@/hooks/use-branches";
import type { Branch } from "@/types/branch";

interface DeleteBranchDialogProps {
  branch: Branch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** يُستدعى بعد نجاح الحذف فعلياً - مفيد لإغلاق لوحة التفاصيل التي فتحت هذا الحوار */
  onDeleted?: () => void;
}

/** حذف نهائي - يرفضه الخادم (409) إن كان بالفرع موظفون أو طلبات مرتبطة؛ التعطيل هو البديل حينها */
export function DeleteBranchDialog({
  branch,
  open,
  onOpenChange,
  onDeleted,
}: DeleteBranchDialogProps) {
  const mutation = useDeleteBranchMutation();
  const hasDependents = !!branch && (branch.usersCount > 0 || branch.ordersCount > 0);

  async function handleConfirm() {
    if (!branch) return;
    try {
      await mutation.mutateAsync(branch.id);
      onOpenChange(false);
      onDeleted?.();
    } catch {
      // رسالة 409 الحقيقية من الخادم تظهر بالفعل عبر toast - يبقى الحوار مفتوحاً
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف الفرع؟</AlertDialogTitle>
          <AlertDialogDescription>
            {hasDependents ? (
              <>
                لا يمكن حذف فرع &quot;{branch?.name}&quot; لارتباط {branch?.usersCount} موظف/موظفين
                و{branch?.ordersCount} طلب/طلبات به. عطّل الفرع بدلاً من ذلك.
              </>
            ) : (
              <>
                سيتم حذف فرع &quot;{branch?.name}&quot; نهائياً. لا يمكن التراجع عن هذا الإجراء.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          {!hasDependents && (
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleConfirm()}
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Spinner className="text-destructive" />}
              حذف
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
