import type { Metadata } from "next";
import { Suspense } from "react";
import { AppLogo } from "@/components/layout/app-logo";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { ForgotPasswordSkeleton } from "@/components/forms/forgot-password-skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "نسيت كلمة المرور" };

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordSkeleton />}>
      <main className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <AppLogo />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">نسيت كلمة المرور؟</CardTitle>
            <CardDescription>أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة التعيين</CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm />
          </CardContent>
        </Card>
      </main>
    </Suspense>
  );
}
