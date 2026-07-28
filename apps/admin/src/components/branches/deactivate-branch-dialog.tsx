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
import { useChangeBranchStatusMutation } from "@/hooks/use-branches";
import type { Branch } from "@/types/branch";

interface DeactivateBranchDialogProps {
  branch: Branch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeactivateBranchDialog({
  branch,
  open,
  onOpenChange,
}: DeactivateBranchDialogProps) {
  const mutation = useChangeBranchStatusMutation(branch?.id ?? "");

  async function handleConfirm() {
    if (!branch) return;
    try {
      await mutation.mutateAsync(false);
      onOpenChange(false);
    } catch {
      // toast بالفعل عبر onError - يبقى الحوار مفتوحاً لإعادة المحاولة
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تعطيل الفرع؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم تعطيل فرع &quot;{branch?.name}&quot; واختفاؤه من قوائم اختيار الفرع. يمكن تفعيله
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
