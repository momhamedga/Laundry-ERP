"use client";

import { Moon } from "lucide-react";
import { useMemo } from "react";
import type {
  FieldErrors,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import type { ChannelSettingsFormValues } from "@/lib/validations/notification-channel-settings";

interface NotificationQuietHoursCardProps {
  watch: UseFormWatch<ChannelSettingsFormValues>;
  setValue: UseFormSetValue<ChannelSettingsFormValues>;
  errors: FieldErrors<ChannelSettingsFormValues>;
  readOnly: boolean;
}

/**
 * خلال ساعات الهدوء: لا Email/SMS/WhatsApp - In-App يعمل دائماً بصرف النظر
 * (يُطبَّق فعلياً بالخادم عبر notification.scheduler، ليس واجهة زخرفية)
 */
export function NotificationQuietHoursCard({
  watch,
  setValue,
  errors,
  readOnly,
}: NotificationQuietHoursCardProps) {
  const enabled = watch("quietHoursEnabled");
  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Moon className="size-4" aria-hidden /> ساعات الهدوء
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <Label htmlFor="quiet-hours-enabled">تفعيل ساعات الهدوء</Label>
            <p className="text-xs text-muted-foreground">
              إيقاف مؤقت للبريد/SMS/واتساب فقط - الإشعارات داخل التطبيق تستمر دائماً
            </p>
          </div>
          <Switch
            id="quiet-hours-enabled"
            checked={enabled}
            onCheckedChange={(checked) => setValue("quietHoursEnabled", checked, { shouldDirty: true })}
            disabled={readOnly}
          />
        </div>

        {enabled && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="quiet-hours-start">من الساعة</Label>
              <Input
                id="quiet-hours-start"
                type="time"
                value={watch("quietHoursStart")}
                onChange={(e) => setValue("quietHoursStart", e.target.value, { shouldDirty: true })}
                disabled={readOnly}
                aria-invalid={!!errors.quietHoursEnabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quiet-hours-end">إلى الساعة</Label>
              <Input
                id="quiet-hours-end"
                type="time"
                value={watch("quietHoursEnd")}
                onChange={(e) => setValue("quietHoursEnd", e.target.value, { shouldDirty: true })}
                disabled={readOnly}
                aria-invalid={!!errors.quietHoursEnabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quiet-hours-timezone">المنطقة الزمنية</Label>
              <Select
                value={watch("quietHoursTimezone")}
                onValueChange={(v) => v && setValue("quietHoursTimezone", v, { shouldDirty: true })}
                disabled={readOnly}
              >
                <SelectTrigger id="quiet-hours-timezone" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        {errors.quietHoursEnabled && (
          <p className="text-xs text-destructive">{errors.quietHoursEnabled.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
