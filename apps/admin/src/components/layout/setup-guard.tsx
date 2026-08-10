"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FullPageSpinner } from "@/components/ui/spinner";
import { useSetupStatus } from "@/hooks/use-setup-status";

/**
 * يمنع استخدام النظام قبل تهيئته.
 *
 * العطل الذي يعالجه: بلا فرع نشط، يصل الموظّف إلى معالج إنشاء الطلب ويملأه
 * كاملاً ثم يفشل عند الحفظ برسالة عن حساب غير مرتبط بفرع. المنع عند المدخل
 * أوضح من الفشل بعد عمل ضائع.
 *
 * لا حلقة توجيه: هذا الحارس يعمل داخل تخطيط (dashboard) وحده، وصفحة /setup
 * خارجه — فلا يراها هذا الحارس أصلاً. وهي بدورها لا تُعيد التوجيه إلى اللوحة
 * إلا حين تكون التهيئة قد تمّت فعلاً، أي في الحالة التي لا يوجّه فيها هذا
 * الحارس أحداً.
 *
 * ويوجَّه غير المخوَّل أيضاً: /setup هي التي تشرح له أن الأمر يتطلّب مدير نظام.
 * إبقاؤه في لوحة لا يعمل فيها شيء يتركه يجرّب ويفشل بلا تفسير.
 */
export function SetupGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, needsSetup } = useSetupStatus();

  useEffect(() => {
    if (needsSetup) router.replace("/setup");
  }, [needsSetup, router]);

  if (isLoading) {
    return <FullPageSpinner label="جارٍ التحقّق من حالة النظام" />;
  }

  if (needsSetup) {
    return <FullPageSpinner label="النظام غير مهيّأ — جارٍ التحويل" />;
  }

  return <>{children}</>;
}
