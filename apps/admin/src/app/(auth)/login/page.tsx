import type { Metadata } from "next";
import { LoginForm } from "@/components/forms/login-form";
import { AppLogo } from "@/components/layout/app-logo";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-sm">
      {/* AppLogo يطبع اسم النظام بجانب الأيقونة، فأي سطر اسم إضافي هنا تكرار. */}
      <div className="mb-8 flex justify-center">
        <AppLogo />
      </div>

      {/*
        العنوان داخل المحتوى لا في CardHeader: الترويسة كانت تضيف حشوها الخاص
        فوق حشو المحتوى، فينشأ فراغ مزدوج يجعل البطاقة تبدو مفكّكة.
      */}
      <Card className="border-border/60 shadow-xl shadow-black/5 backdrop-blur-sm">
        <CardContent className="p-6 sm:p-7">
          <div className="mb-6 space-y-1.5 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">تسجيل الدخول</h1>
            <p className="text-sm text-muted-foreground">
              ادخل بياناتك للوصول إلى لوحة التحكم
            </p>
          </div>
          <LoginForm />
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        الدخول مُقتصر على المستخدمين المصرَّح لهم
      </p>
    </main>
  );
}
