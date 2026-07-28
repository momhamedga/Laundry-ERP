"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { useProfileQuery } from "@/hooks/use-profile";
import { getErrorMessage } from "@/lib/axios";
import { ChangePasswordCard } from "./change-password-card";
import { ChangePasswordErrorState } from "./change-password-error-state";
import { ChangePasswordForm } from "./change-password-form";
import { ChangePasswordSkeleton } from "./change-password-skeleton";

/** جسم صفحة تغيير كلمة السر - يعيد استخدام useProfileQuery الموجود فقط لعرض سياق الحساب (البريد) */
export function ChangePasswordView() {
  const { data: profile, isLoading, isError, error, refetch } = useProfileQuery();

  if (isLoading) return <ChangePasswordSkeleton />;
  if (isError) {
    return <ChangePasswordErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="تغيير كلمة المرور"
        description={
          profile ? `لحساب ${profile.user.email}` : "أدخل كلمة السر الحالية والجديدة"
        }
        actions={
          <Link href="/profile" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowRight aria-hidden /> رجوع للملف الشخصي
          </Link>
        }
      />

      <div className="max-w-lg">
        <ChangePasswordCard>
          <ChangePasswordForm />
        </ChangePasswordCard>
      </div>
    </div>
  );
}
