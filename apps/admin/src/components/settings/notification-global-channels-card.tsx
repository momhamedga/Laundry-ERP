"use client";

import { Radio } from "lucide-react";
import type { UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ChannelSettingsFormValues } from "@/lib/validations/notification-channel-settings";

interface NotificationGlobalChannelsCardProps {
  watch: UseFormWatch<ChannelSettingsFormValues>;
  setValue: UseFormSetValue<ChannelSettingsFormValues>;
  readOnly: boolean;
}

const CHANNEL_ROWS: {
  field: keyof ChannelSettingsFormValues;
  label: string;
  description: string;
}[] = [
  { field: "globalInApp", label: "داخل التطبيق", description: "الجرس ومركز الإشعارات" },
  { field: "globalEmail", label: "البريد الإلكتروني", description: "عبر Resend" },
  { field: "globalSms", label: "الرسائل النصية SMS", description: "بوّابة غير مُهيَّأة بعد" },
  { field: "globalWhatsapp", label: "واتساب", description: "بوّابة غير مُهيَّأة بعد" },
  { field: "globalPush", label: "الإشعارات الفورية Push", description: "بوّابة غير مُهيَّأة بعد" },
];

/**
 * مفاتيح رئيسية - إيقاف قناة هنا يُعطِّلها بالكامل بصرف النظر عن تفعيلها
 * لأي نوع بمصفوفة الأنواع أدناه (راجع notification.service.ts:dispatch بالخادم)
 */
export function NotificationGlobalChannelsCard({
  watch,
  setValue,
  readOnly,
}: NotificationGlobalChannelsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Radio className="size-4" aria-hidden /> القنوات العامة
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {CHANNEL_ROWS.map((row) => (
          <div key={row.field} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label htmlFor={`global-${row.field}`}>{row.label}</Label>
              <p className="text-xs text-muted-foreground">{row.description}</p>
            </div>
            <Switch
              id={`global-${row.field}`}
              checked={watch(row.field) as boolean}
              onCheckedChange={(checked) => setValue(row.field, checked, { shouldDirty: true })}
              disabled={readOnly}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
