"use client";

import { Building2 } from "lucide-react";
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_LANGUAGES, type SettingsFormValues } from "@/lib/validations/settings";

const LANGUAGE_LABELS: Record<(typeof SUPPORTED_LANGUAGES)[number], string> = {
  ar: "العربية",
  en: "English",
};

interface GeneralSettingsCardProps {
  register: UseFormRegister<SettingsFormValues>;
  errors: FieldErrors<SettingsFormValues>;
  watch: UseFormWatch<SettingsFormValues>;
  setValue: UseFormSetValue<SettingsFormValues>;
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

export function GeneralSettingsCard({
  register,
  errors,
  watch,
  setValue,
  readOnly,
}: GeneralSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Building2 className="size-4" aria-hidden /> عام
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="settings-company-name">اسم الشركة *</Label>
          <Input
            id="settings-company-name"
            readOnly={readOnly}
            aria-invalid={!!errors.companyName}
            aria-readonly={readOnly}
            {...register("companyName")}
          />
          <FieldError message={errors.companyName?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settings-company-email">البريد الإلكتروني</Label>
          <Input
            id="settings-company-email"
            type="email"
            dir="ltr"
            readOnly={readOnly}
            aria-invalid={!!errors.companyEmail}
            {...register("companyEmail")}
          />
          <FieldError message={errors.companyEmail?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settings-company-phone">رقم الهاتف</Label>
          <Input
            id="settings-company-phone"
            dir="ltr"
            placeholder="+201001234567"
            readOnly={readOnly}
            aria-invalid={!!errors.companyPhone}
            {...register("companyPhone")}
          />
          <FieldError message={errors.companyPhone?.message} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="settings-company-address">العنوان</Label>
          <Input
            id="settings-company-address"
            readOnly={readOnly}
            aria-invalid={!!errors.companyAddress}
            {...register("companyAddress")}
          />
          <FieldError message={errors.companyAddress?.message} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="settings-company-logo">رابط شعار الشركة</Label>
          <Input
            id="settings-company-logo"
            dir="ltr"
            placeholder="https://..."
            readOnly={readOnly}
            aria-invalid={!!errors.companyLogoUrl}
            {...register("companyLogoUrl")}
          />
          <FieldError message={errors.companyLogoUrl?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settings-currency">العملة الافتراضية *</Label>
          <Input
            id="settings-currency"
            dir="ltr"
            maxLength={3}
            placeholder="EGP"
            readOnly={readOnly}
            aria-invalid={!!errors.defaultCurrency}
            {...register("defaultCurrency")}
          />
          <FieldError message={errors.defaultCurrency?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settings-timezone">المنطقة الزمنية الافتراضية *</Label>
          <Input
            id="settings-timezone"
            dir="ltr"
            placeholder="Africa/Cairo"
            readOnly={readOnly}
            aria-invalid={!!errors.defaultTimezone}
            {...register("defaultTimezone")}
          />
          <FieldError message={errors.defaultTimezone?.message} />
        </div>

        <div className="space-y-1.5">
          <Label>اللغة الافتراضية *</Label>
          <Select
            value={watch("defaultLanguage")}
            onValueChange={(v) => {
              if (v) setValue("defaultLanguage", v as SettingsFormValues["defaultLanguage"], { shouldDirty: true });
            }}
            items={LANGUAGE_LABELS}
            disabled={readOnly}
          >
            <SelectTrigger className="w-full" aria-label="اللغة الافتراضية">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
