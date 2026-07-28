"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppLogo } from "@/components/layout/app-logo";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordErrorState } from "./reset-password-error-state";
import { ResetPasswordForm } from "./reset-password-form";

/** يقرأ token من searchParams (وليس Local Storage) - رابط بلا token = رابط غير صالح */
export function ResetPasswordView() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  return (
    <main className="w-full max-w-sm">
      <div className="mb-6 flex justify-center">
        <AppLogo />
      </div>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">إعادة تعيين كلمة المرور</CardTitle>
          {token && <CardDescription>أدخل كلمة المرور الجديدة لحسابك</CardDescription>}
        </CardHeader>
        <CardContent>
          {!token ? (
            <ResetPasswordErrorState
              title="رابط غير صالح"
              description="رابط إعادة تعيين كلمة المرور غير صالح أو غير مكتمل. تأكد من نسخ الرابط كاملاً من البريد الإلكتروني."
              action={
                <Link href="/forgot-password" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  طلب رابط جديد
                </Link>
              }
            />
          ) : (
            <ResetPasswordForm token={token} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
