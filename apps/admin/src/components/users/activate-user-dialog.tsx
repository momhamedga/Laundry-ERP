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

interface ActivateUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivateUserDialog({ user, open, onOpenChange }: ActivateUserDialogProps) {
  const mutation = useChangeUserStatusMutation(user?.id ?? "");

  async function handleConfirm() {
    if (!user) return;
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
          <AlertDialogTitle>تفعيل المستخدم؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيصبح حساب &quot;{user?.name}&quot; نشطاً مجدداً ويمكنه تسجيل الدخول.
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
