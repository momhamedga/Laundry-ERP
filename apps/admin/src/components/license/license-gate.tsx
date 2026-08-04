"use client";

import Link from "next/link";
import { AlertTriangle, KeyRound, ShieldAlert } from "lucide-react";
import { useState, type ReactElement } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLicenseGuard } from "@/hooks/use-license-guard";

/**
 * بوّابة الترخيص الموحّدة (Phase 15B) — تُلفّ حول أي زرّ ينشئ بيانات مالية.
 *
 * بدل تكرار فحص الترخيص في كل شاشة، تُستعمل هكذا:
 *
 * ```tsx
 * <LicenseGate>
 *   {(guard) => <Button disabled={!guard.canSell} onClick={guard.attempt(openForm)}>طلب جديد</Button>}
 * </LicenseGate>
 * ```
 *
 * عند انتهاء الترخيص: الزرّ يبقى ظاهراً وقابلاً للضغط، ويعرض الضغط حواراً
 * احترافياً يشرح ما زال متاحاً — بلا انهيار ولا خطأ شبكة غامض.
 */

export interface GateRenderProps {
  /** هل يُسمح بالإنشاء؟ */
  canSell: boolean;
  /** يلفّ أي معالج: يُنفّذه إن كان مسموحاً، وإلا يفتح حوار المنع */
  attempt: (action: () => void) => () => void;
}

export function LicenseGate({
  children,
}: {
  children: (props: GateRenderProps) => ReactElement;
}): ReactElement {
  const { canSell } = useLicenseGuard();
  const [open, setOpen] = useState(false);

  const attempt = (action: () => void) => () => {
    if (canSell) {
      action();
      return;
    }
    setOpen(true);
  };

  return (
    <>
      {children({ canSell, attempt })}
      <LicenseBlockedDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

/** حوار المنع — نفس نصّ حوار العملية الرئيسية. */
export function LicenseBlockedDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" aria-hidden />
            انتهت صلاحية الترخيص
          </DialogTitle>
          <DialogDescription>
            لا يمكن إنشاء عمليات جديدة حتى يتم تفعيل البرنامج.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="font-medium">يمكنك الاستمرار في:</p>
          <ul className="space-y-1.5 text-muted-foreground">
            {[
              "مشاهدة البيانات والبحث والتصفية",
              "النسخ الاحتياطي والاستعادة",
              "التقارير والتصدير",
              "الطباعة",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span aria-hidden className="text-emerald-600">
                  ✔
                </span>
                {t}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            بياناتك محفوظة بالكامل ولن تُحذف. يرجى تفعيل البرنامج لاستئناف
            تسجيل العمليات.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
          <Link
            href="/license"
            onClick={() => onOpenChange(false)}
            className={buttonVariants()}
          >
            <KeyRound aria-hidden /> تفعيل البرنامج
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * شريط تحذير فترة السماح — يُعرض أعلى الصفحات أثناء السماح فقط.
 * غير مزعج: لا يحجب شيئاً ولا يمنع أي عملية.
 */
export function LicenseGraceBanner(): ReactElement | null {
  const { inGrace, graceDaysRemaining } = useLicenseGuard();
  if (!inGrace) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-200"
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      <span>
        الترخيص غير مُفعَّل — النظام يعمل كاملاً لمدة{" "}
        <strong>{graceDaysRemaining}</strong> يوماً أخرى.
      </span>
      <Link href="/license" className="font-medium underline underline-offset-4">
        تفعيل الآن
      </Link>
    </div>
  );
}
