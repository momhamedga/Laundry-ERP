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
import { useDeleteBackupMutation } from "@/hooks/use-backup";
import type { BackupRecord } from "@/types/backup";

interface DeleteBackupDialogProps {
  backup: BackupRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** حذف نسخة واحدة - Soft delete بالخادم + حذف الملف من القرص */
export function DeleteBackupDialog({ backup, open, onOpenChange }: DeleteBackupDialogProps) {
  const mutation = useDeleteBackupMutation();

  async function handleConfirm() {
    if (!backup) return;
    try {
      await mutation.mutateAsync(backup.id);
      onOpenChange(false);
    } catch {
      // toast عبر onError - يبقى الحوار مفتوحاً
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف النسخة الاحتياطية؟</AlertDialogTitle>
          <AlertDialogDescription dir="ltr" className="break-all text-right">
            {backup?.filename}
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
            حذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
