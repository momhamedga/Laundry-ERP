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

interface ActivateBranchDialogProps {
  branch: Branch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivateBranchDialog({ branch, open, onOpenChange }: ActivateBranchDialogProps) {
  const mutation = useChangeBranchStatusMutation(branch?.id ?? "");

  async function handleConfirm() {
    if (!branch) return;
    try {
      await mutation.mutateAsync(true);
      onOpenChange(false);
    } catch {
      // toast بالفعل عبر onError - يبقى الحوار مفتوحاً لإعادة المحاولة
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تفعيل الفرع؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيصبح فرع &quot;{branch?.name}&quot; نشطاً مجدداً ويظهر في قوائم اختيار الفرع.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleConfirm()} disabled={mutation.isPending}>
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            تفعيل
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
