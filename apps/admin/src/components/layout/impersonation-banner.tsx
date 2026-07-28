"use client";

import { UserCog } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/store/auth-store";

/**
 * شريط تنبيه الانتحال (Phase 9.6c) - يظهر أعلى الصفحة أثناء جلسة "الدخول كمستخدم".
 * لون تحذيري واضح + زر العودة لحساب المدير.
 */
export function ImpersonationBanner() {
  const impersonator = useAuthStore((s) => s.impersonator);
  const user = useAuthStore((s) => s.user);
  const stop = useAuthStore((s) => s.stopImpersonation);
  const [pending, setPending] = useState(false);

  if (!impersonator) return null;

  async function handleStop() {
    setPending(true);
    try {
      await stop();
      toast.success("عدت إلى حسابك");
    } catch {
      toast.error("تعذّر إنهاء الانتحال");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-warning px-4 py-2 text-sm font-medium text-warning-foreground">
      <span className="flex items-center gap-2">
        <UserCog className="size-4" aria-hidden />
        أنت الآن تنتحل صفة {user?.name} — كل الإجراءات تُسجَّل باسم {impersonator.name}.
      </span>
      <Button
        size="sm"
        variant="outline"
        className="border-warning-foreground/30 bg-transparent"
        disabled={pending}
        onClick={() => void handleStop()}
      >
        {pending && <Spinner className="size-3.5" />}
        العودة لحسابي ({impersonator.name})
      </Button>
    </div>
  );
}
