"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { useProfileQuery } from "@/hooks/use-profile";
import { getErrorMessage } from "@/lib/axios";
import { ProfileEmptyState } from "./profile-empty-state";
import { ProfileErrorState } from "./profile-error-state";
import { ProfileForm } from "./profile-form";
import { ProfileHeader } from "./profile-header";
import { ProfileInformation } from "./profile-information";
import { ProfileSkeleton } from "./profile-skeleton";

/** جسم صفحة الملف الشخصي - GET/PATCH /users/profile فقط (self) */
export function ProfileView() {
  const { data: profile, isLoading, isError, error, refetch } = useProfileQuery();

  if (isLoading) return <ProfileSkeleton />;
  if (isError) return <ProfileErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />;
  if (!profile) return <ProfileEmptyState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الملف الشخصي"
        description="بياناتك الشخصية وإعدادات حسابك"
        actions={
          <>
            <Link href="/profile/sessions" className={buttonVariants({ variant: "outline" })}>
              <ShieldCheck aria-hidden /> الجلسات النشطة
            </Link>
            <Link href="/profile/change-password" className={buttonVariants({ variant: "outline" })}>
              <KeyRound aria-hidden /> تغيير كلمة المرور
            </Link>
          </>
        }
      />

      <ProfileHeader user={profile.user} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileInformation profile={profile} />
        <ProfileForm user={profile.user} />
      </div>
    </div>
  );
}
