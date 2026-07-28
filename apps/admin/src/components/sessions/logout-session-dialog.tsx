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
import { useRevokeSessionMutation } from "@/hooks/use-auth";
import { parseUserAgent } from "@/lib/session-utils";
import type { SessionInfo } from "@/types/session";

interface LogoutSessionDialogProps {
  session: SessionInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** تسجيل خروج من جلسة أخرى محددة (غير الحالية) - DELETE /auth/sessions الحقيقي */
export function LogoutSessionDialog({ session, open, onOpenChange }: LogoutSessionDialogProps) {
  const mutation = useRevokeSessionMutation();
  const parsed = session ? parseUserAgent(session.userAgent) : null;

  async function handleConfirm() {
    if (!session) return;
    try {
      await mutation.mutateAsync(session.id);
      onOpenChange(false);
    } catch {
      // toast بالفعل عبر onError الخاص بالـ mutation
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تسجيل الخروج من هذه الجلسة؟</AlertDialogTitle>
          <AlertDialogDescription>
            {parsed && (
              <>
                سيتم إبطال جلسة &quot;{parsed.browser} - {parsed.os}&quot; ({session?.ipAddress ?? "IP غير معروف"}
                ). سيحتاج هذا الجهاز لتسجيل الدخول من جديد.
              </>
            )}
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
            تسجيل الخروج
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
