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
import { useChangeUserStatusMutation } from "@/hooks/use-users";
import type { User } from "@/types/user";

interface DeactivateUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** تعطيل مستخدم - يُبطل جلساته بالخادم فوراً (soft فقط - لا حذف، قابل للتفعيل لاحقاً) */
export function DeactivateUserDialog({ user, open, onOpenChange }: DeactivateUserDialogProps) {
  const mutation = useChangeUserStatusMutation(user?.id ?? "");

  async function handleConfirm() {
    if (!user) return;
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
          <AlertDialogTitle>تعطيل المستخدم؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم تعطيل حساب &quot;{user?.name}&quot; وإبطال كل جلساته الحالية فوراً. يمكن تفعيله
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
