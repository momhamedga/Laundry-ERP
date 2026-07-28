"use client";

import { Palette } from "lucide-react";
import type { UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  SUPPORTED_DATE_FORMATS,
  SUPPORTED_THEMES,
  SUPPORTED_TIME_FORMATS,
  type SettingsFormValues,
} from "@/lib/validations/settings";

const THEME_LABELS: Record<(typeof SUPPORTED_THEMES)[number], string> = {
  light: "فاتح",
  dark: "داكن",
  system: "حسب النظام",
};

const TIME_FORMAT_LABELS: Record<(typeof SUPPORTED_TIME_FORMATS)[number], string> = {
  "12h": "12 ساعة",
  "24h": "24 ساعة",
};

interface AppearanceSettingsCardProps {
  watch: UseFormWatch<SettingsFormValues>;
  setValue: UseFormSetValue<SettingsFormValues>;
  readOnly: boolean;
}

export function AppearanceSettingsCard({ watch, setValue, readOnly }: AppearanceSettingsCardProps) {
  const rtlEnabled = watch("rtlEnabled");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Palette className="size-4" aria-hidden /> المظهر
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>المظهر الافتراضي *</Label>
          <Select
            value={watch("defaultTheme")}
            onValueChange={(v) => {
              if (v) setValue("defaultTheme", v as SettingsFormValues["defaultTheme"], { shouldDirty: true });
            }}
            items={THEME_LABELS}
            disabled={readOnly}
          >
            <SelectTrigger className="w-full" aria-label="المظهر الافتراضي">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_THEMES.map((theme) => (
                <SelectItem key={theme} value={theme}>
                  {THEME_LABELS[theme]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>صيغة الوقت *</Label>
          <Select
            value={watch("timeFormat")}
            onValueChange={(v) => {
              if (v) setValue("timeFormat", v as SettingsFormValues["timeFormat"], { shouldDirty: true });
            }}
            items={TIME_FORMAT_LABELS}
            disabled={readOnly}
          >
            <SelectTrigger className="w-full" aria-label="صيغة الوقت">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_TIME_FORMATS.map((fmt) => (
                <SelectItem key={fmt} value={fmt}>
                  {TIME_FORMAT_LABELS[fmt]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>صيغة التاريخ *</Label>
          <Select
            value={watch("dateFormat")}
            onValueChange={(v) => {
              if (v) setValue("dateFormat", v as SettingsFormValues["dateFormat"], { shouldDirty: true });
            }}
            items={Object.fromEntries(SUPPORTED_DATE_FORMATS.map((f) => [f, f]))}
            disabled={readOnly}
          >
            <SelectTrigger className="w-full" dir="ltr" aria-label="صيغة التاريخ">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_DATE_FORMATS.map((fmt) => (
                <SelectItem key={fmt} value={fmt}>
                  <span dir="ltr">{fmt}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <Label htmlFor="settings-rtl-enabled">تفعيل RTL</Label>
            <p className="text-xs text-muted-foreground">عرض الواجهة من اليمين لليسار</p>
          </div>
          <Switch
            id="settings-rtl-enabled"
            checked={rtlEnabled}
            onCheckedChange={(checked) => setValue("rtlEnabled", checked, { shouldDirty: true })}
            disabled={readOnly}
          />
        </div>
      </CardContent>
    </Card>
  );
}
