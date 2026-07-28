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
import { useRevokeAllOtherSessionsMutation } from "@/hooks/use-auth";
import type { SessionInfo } from "@/types/session";

interface LogoutAllSessionsDialogProps {
  /** الجلسات الأخرى (غير الحالية) فقط - الحالية مُستثناة دائماً */
  otherSessions: readonly SessionInfo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * تسجيل خروج من كل الأجهزة الأخرى - لا Endpoint حقيقي مخصص لهذه العملية
 * بالخادم، لذا تُنفَّذ كتركيب من استدعاءات DELETE /auth/sessions حقيقية
 * متعددة (واحد لكل جلسة أخرى) - موثَّق بوضوح، وليس محاكاة أو Mock.
 */
export function LogoutAllSessionsDialog({
  otherSessions,
  open,
  onOpenChange,
}: LogoutAllSessionsDialogProps) {
  const mutation = useRevokeAllOtherSessionsMutation();

  async function handleConfirm() {
    if (otherSessions.length === 0) return;
    try {
      await mutation.mutateAsync(otherSessions.map((s) => s.id));
      onOpenChange(false);
    } catch {
      // toast بالفعل عبر onError الخاص بالـ mutation
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تسجيل الخروج من كل الأجهزة الأخرى؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم إبطال {otherSessions.length} جلسة أخرى غير جلستك الحالية. ستبقى مسجَّلاً
            بهذا الجهاز.
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
            تسجيل الخروج من الكل
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
