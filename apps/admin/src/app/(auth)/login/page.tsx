import type { Metadata } from "next";
import { LoginForm } from "@/components/forms/login-form";
import { AppLogo } from "@/components/layout/app-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function LoginPage() {
  return (
    <main className="w-full max-w-sm">
      <div className="mb-6 flex justify-center">
        <AppLogo />
      </div>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
          <CardDescription>ادخل بياناتك للوصول إلى لوحة التحكم</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
