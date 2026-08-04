import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { LicenseBlockedListener } from "@/components/license/license-blocked-listener";
import { LicenseGraceBanner } from "@/components/license/license-gate";

/** تخطيط اللوحة: حماية + شريط جانبي + هيدر + المحتوى */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
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
    </AuthGuard>
  );
}
