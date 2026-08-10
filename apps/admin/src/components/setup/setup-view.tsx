"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { FullPageSpinner } from "@/components/ui/spinner";
import { useActiveBranchesQuery } from "@/hooks/use-branches";
import { useSetupStatus } from "@/hooks/use-setup-status";
import { SetupWizard } from "./setup-wizard";

/**
 * بوابة صفحة /setup.
 *
 * ثلاث حالات لا تُخلَط:
 *  - النظام مهيّأ ⇒ لا معنى للمعالج، فيُعاد المستخدم للوحة.
 *  - غير مهيّأ ومستخدم بلا صلاحية ⇒ رسالة صريحة، لا معالج ولا توجيه.
 *    التوجيه هنا كان سينتج حلقة: الحارس يدفعه إلى /setup، والصفحة تدفعه للوحة.
 *  - غير مهيّأ ومستخدم مخوَّل ⇒ المعالج.
 */
export function SetupView() {
  const router = useRouter();
  const { isLoading, needsSetup, canRunSetup, isUnknown } = useSetupStatus();
  const { data: branches } = useActiveBranchesQuery();

  const alreadyInitialized = !isLoading && !needsSetup && !isUnknown;

  useEffect(() => {
    if (alreadyInitialized) router.replace("/");
  }, [alreadyInitialized, router]);

  if (isLoading) {
    return <FullPageSpinner label="جارٍ التحقّق من حالة النظام" />;
  }

  /**
   * تعذّر تحديد الحالة (شبكة/خادم): لا نعرض معالج تهيئة قد تكون تمّت أصلاً —
   * إنشاء فرع ثانٍ أسوأ من رسالة انتظار.
   */
  if (isUnknown) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" aria-hidden />
        <h1 className="text-lg font-semibold">تعذّر التحقّق من حالة النظام</h1>
        <p className="text-sm text-muted-foreground">
          تأكّد من الاتصال بالخادم ثم أعِد تحميل الصفحة.
        </p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          العودة للوحة التحكم
        </Link>
      </div>
    );
  }

  if (alreadyInitialized) {
    return <FullPageSpinner label="النظام مهيّأ — جارٍ التحويل" />;
  }

  if (!canRunSetup) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" aria-hidden />
        <h1 className="text-lg font-semibold">النظام غير مهيّأ بعد</h1>
        <p className="text-sm text-muted-foreground">
          لا يمكن استخدام النظام قبل إضافة فرع وخدمات. هذه الخطوة تتطلّب حساب مدير النظام —
          تواصل مع المسؤول لإتمامها.
        </p>
      </div>
    );
  }

  /**
   * فرعٌ موجود لكن غير نشط لا يعني بداية من الصفر — تُمرَّر بدايةٌ فارغة والمعالج
   * يبدأ من خطوة الفرع، وهو الصحيح: النظام يشترط فرعاً **نشطاً**.
   */
  const initialBranch = branches?.[0] ? { id: branches[0].id, name: branches[0].name } : null;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <SetupWizard initialBranch={initialBranch} />
    </div>
  );
}
