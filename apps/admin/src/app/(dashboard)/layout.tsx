import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { SetupGuard } from "@/components/layout/setup-guard";
import { LicenseBlockedListener } from "@/components/license/license-blocked-listener";
import { LicenseGraceBanner } from "@/components/license/license-gate";

/**
 * تخطيط اللوحة: حماية + تهيئة + شريط جانبي + هيدر + المحتوى.
 *
 * SetupGuard داخل AuthGuard لا خارجه: حالة التهيئة تُقرأ من مسار يتطلّب
 * مصادقة، فسؤالها قبل ثبوت الجلسة يعني طلباً يُردّ بـ401 ثم يُقرأ خطؤه كأنه
 * «تعذّر التحقّق».
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SetupGuard>
        <div className="flex min-h-dvh">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <ImpersonationBanner />
            <AppHeader />
            <main className="flex-1 space-y-4 p-4 md:p-6">
              <LicenseGraceBanner />
              {children}
            </main>
            <LicenseBlockedListener />
          </div>
        </div>
      </SetupGuard>
    </AuthGuard>
  );
}
