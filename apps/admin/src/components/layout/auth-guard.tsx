"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FullPageSpinner } from "@/components/ui/spinner";
import { useCurrentUserQuery } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { SessionExpiredDialog } from "./session-expired-dialog";

/**
 * Protected Routes:
 * 1. عند الإقلاع يحاول استعادة الجلسة عبر كوكي الـ Refresh
 * 2. أثناء التحقق يعرض شاشة تحميل
 * 3. غير مسجل → توجيه لصفحة الدخول
 * 4. جلسة منتهية → Dialog ثم توجيه
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  // Session Restore عند فتح التطبيق (idempotent داخل الـ store)
  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  // Unauthorized Redirect (الجلسة المنتهية يتولاها الـ Dialog)
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !sessionExpired) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, sessionExpired, router]);

  // مزامنة دورية لبيانات المستخدم الحالي
  useCurrentUserQuery();

  if (isLoading) {
    return <FullPageSpinner label="جارٍ التحقق من الجلسة" />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <FullPageSpinner label="جارٍ إعادة التوجيه" />
        <SessionExpiredDialog />
      </>
    );
  }

  return (
    <>
      {children}
      <SessionExpiredDialog />
    </>
  );
}
