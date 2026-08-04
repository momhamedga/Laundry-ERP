"use client";

import { useQuery } from "@tanstack/react-query";
import { desktopBridge, type DesktopLicenseStatus } from "@/lib/desktop";

/**
 * نقطة التحقق الموحّدة للترخيص في الواجهة (Phase 15B).
 *
 * تُستعمل بدل تكرار `if (!license)` في كل شاشة. المنع الحقيقي مفروض في العملية
 * الرئيسية (حارس IPC + حارس الشبكة)؛ هذا الخطّاف مسؤول عن **تجربة الاستخدام**:
 * تعطيل أزرار الإنشاء وعرض حوار واضح بدل ترك الطلب يفشل بخطأ شبكة غامض.
 *
 * خارج تطبيق سطح المكتب (متصفّح عادي) لا يوجد ترخيص أصلاً ⇒ كل شيء مسموح.
 */

/** نفس مفتاح استعلام صفحة الترخيص — استيراد ترخيص يحدّث الحارس تلقائياً. */
export const LICENSE_QUERY_KEY = ["license", "status"] as const;

export interface LicenseGuard {
  /** هل يُسمح بإنشاء بيانات مالية جديدة؟ */
  canSell: boolean;
  /** داخل فترة السماح: يعمل كل شيء مع تحذير */
  inGrace: boolean;
  /** أيام متبقّية في فترة السماح (إن كنّا فيها) */
  graceDaysRemaining: number | null;
  /** أيام متبقّية قبل انتهاء ترخيص صالح (null = دائم أو غير معروف) */
  daysRemaining: number | null;
  /** الحالة الكاملة إن توفّرت */
  status: DesktopLicenseStatus | null;
  /** هل نحن داخل تطبيق سطح المكتب؟ */
  isDesktopApp: boolean;
  /** ما زال يُحمّل — لا تمنع المستخدم قبل معرفة الحالة */
  isLoading: boolean;
}

export function useLicenseGuard(): LicenseGuard {
  const bridge = desktopBridge();

  const query = useQuery({
    queryKey: LICENSE_QUERY_KEY,
    enabled: bridge !== null,
    staleTime: 60_000,
    queryFn: async () => {
      const b = desktopBridge();
      if (!b) throw new Error("الجسر غير متاح");
      const [status, machineId] = await Promise.all([b.license.status(), b.license.machineId()]);
      return { status, machineId };
    },
  });

  const status = query.data?.status ?? null;

  // خارج Electron، أو قبل وصول الحالة، أو عند فشل القراءة ⇒ لا نمنع المستخدم.
  // المنع الحقيقي في العملية الرئيسية على أي حال، فالتساهل هنا آمن ولا يُعطّل
  // مغسلة بسبب خطأ عابر في قراءة الحالة.
  const canSell = bridge === null || status === null || status.valid || status.inGrace === true;

  return {
    canSell,
    inGrace: status?.inGrace === true && status.valid !== true,
    graceDaysRemaining: status?.graceDaysRemaining ?? null,
    daysRemaining: status?.daysRemaining ?? null,
    status,
    isDesktopApp: bridge !== null,
    isLoading: bridge !== null && query.isPending,
  };
}
