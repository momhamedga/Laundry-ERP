"use client";

import { Layers } from "lucide-react";
import type { UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIGEST_MODES } from "@/lib/validations/notification-channel-settings";
import type { ChannelSettingsFormValues } from "@/lib/validations/notification-channel-settings";

interface NotificationDigestCardProps {
  watch: UseFormWatch<ChannelSettingsFormValues>;
  setValue: UseFormSetValue<ChannelSettingsFormValues>;
  readOnly: boolean;
}

const DIGEST_LABELS: Record<(typeof DIGEST_MODES)[number], string> = {
  INSTANT: "فوري - كل إشعار مباشرة",
  HOURLY: "مجمَّع كل ساعة",
  DAILY: "مجمَّع يومياً",
  WEEKLY: "مجمَّع أسبوعياً",
};

/** يُخزَّن فقط حالياً - لا Scheduler يُطبِّق التجميع الفعلي بهذه المرحلة (راجع التقرير) */
export function NotificationDigestCard({ watch, setValue, readOnly }: NotificationDigestCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Layers className="size-4" aria-hidden /> وضع التجميع (Digest)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          role="note"
          className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning-foreground dark:text-warning"
        >
          تفضيل يُخزَّن فقط حالياً - كل الإشعارات تصل فورياً بغضّ النظر عن هذا الاختيار
          إلى حين تفعيل مُجدوِل التجميع مستقبلاً.
        </div>
        <Select
          value={watch("digestMode")}
          onValueChange={(v) => v && setValue("digestMode", v as ChannelSettingsFormValues["digestMode"], { shouldDirty: true })}
          disabled={readOnly}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIGEST_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {DIGEST_LABELS[mode]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
