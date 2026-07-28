"use client";

import { TimerOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/auth-store";

/** يظهر عند فشل تجديد الجلسة (انتهاء Refresh Token) */
export function SessionExpiredDialog() {
  const router = useRouter();
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const dismiss = useAuthStore((s) => s.dismissSessionExpired);

  function goToLogin() {
    dismiss();
    router.replace("/login");
  }

  return (
    <Dialog open={sessionExpired} onOpenChange={(open) => !open && goToLogin()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-1 flex size-12 items-center justify-center rounded-full bg-warning/15 text-warning">
            <TimerOff className="size-6" aria-hidden />
          </div>
          <DialogTitle className="text-center">انتهت الجلسة</DialogTitle>
          <DialogDescription className="text-center">
            انتهت صلاحية جلستك لأسباب أمنية. سجّل الدخول مرة أخرى للمتابعة.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="w-full" onClick={goToLogin}>
            تسجيل الدخول
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
