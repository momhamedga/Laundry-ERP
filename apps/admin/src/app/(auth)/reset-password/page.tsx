import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordSkeleton } from "@/components/forms/reset-password-skeleton";
import { ResetPasswordView } from "@/components/forms/reset-password-view";

export const metadata: Metadata = { title: "إعادة تعيين كلمة المرور" };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordView />
    </Suspense>
  );
}
