"use client";

import { ShieldCheck } from "lucide-react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SettingsFormValues } from "@/lib/validations/settings";

interface SecuritySettingsCardProps {
  register: UseFormRegister<SettingsFormValues>;
  errors: FieldErrors<SettingsFormValues>;
  readOnly: boolean;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

/**
 * حقل واحد فقط قابل للتعديل فعلياً (passwordExpirationDays) - هو الحقل
 * الوحيد الذي يعيده الـAPI بقسم security. لا Session Timeout ولا Password
 * Minimum Length هنا: كلاهما ليس جزءاً من استجابة API الإعدادات إطلاقاً
 * (مُتحكَّم بهما فعلياً بمكان آخر بالخادم) - لا تُعرَض بيانات غير قادمة
 * من الـAPI هنا، فقط ملاحظة توضيحية نصية بدون أرقام مُختلَقة.
 */
export function SecuritySettingsCard({ register, errors, readOnly }: SecuritySettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <ShieldCheck className="size-4" aria-hidden /> الأمان
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5 sm:max-w-xs">
          <Label htmlFor="settings-password-expiration">مدة صلاحية كلمة المرور (بالأيام)</Label>
          <Input
            id="settings-password-expiration"
            dir="ltr"
            inputMode="numeric"
            placeholder="بلا انتهاء صلاحية"
            readOnly={readOnly}
            aria-invalid={!!errors.passwordExpirationDays}
            {...register("passwordExpirationDays")}
          />
          <FieldError message={errors.passwordExpirationDays?.message} />
          <p className="text-xs text-muted-foreground">
            اتركه فارغاً لتعطيل انتهاء الصلاحية. تخزين تهيئة فقط - لا فحص تشغيلي يُجبر تغيير
            كلمة المرور بعد بهذه المرحلة.
          </p>
        </div>

        <p className="rounded-lg border bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
          مدة الجلسة والحد الأدنى لطول كلمة المرور غير مُدارَين من هذه الصفحة - هما إعدادات
          خادم حقيقية مُطبَّقة فعلياً في مكان آخر، وليستا جزءاً من بيانات هذا الـAPI.
        </p>
      </CardContent>
    </Card>
  );
}
