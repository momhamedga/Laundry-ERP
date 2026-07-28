"use client";

import { Bell, TriangleAlert } from "lucide-react";
import type { UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SettingsFormValues } from "@/lib/validations/settings";

interface NotificationsSettingsCardProps {
  watch: UseFormWatch<SettingsFormValues>;
  setValue: UseFormSetValue<SettingsFormValues>;
  readOnly: boolean;
}

interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled: boolean;
}

function ToggleRow({ id, label, description, checked, onCheckedChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

/**
 * تفضيلات مُخزَّنة فقط بالخادم - **ليست تفعيلاً لخدمة إرسال فعلية**: البريد
 * محدود حالياً بإرسال روابط إعادة تعيين كلمة السر فقط (لا إشعارات عامة)،
 * وSMS بلا أي بنية إرسال بالمشروع إطلاقاً. التبديل هنا يُخزِّن التفضيل فقط.
 */
export function NotificationsSettingsCard({
  watch,
  setValue,
  readOnly,
}: NotificationsSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Bell className="size-4" aria-hidden /> الإشعارات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          role="note"
          className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning-foreground dark:text-warning"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            هذه تفضيلات تُخزَّن فقط ولا تُفعِّل خدمة إرسال فعلية بعد. البريد الإلكتروني
            مُستخدَم حالياً فقط لإعادة تعيين كلمة المرور، وSMS بلا أي بنية إرسال بالمشروع بعد.
          </p>
        </div>

        <ToggleRow
          id="settings-email-notifications"
          label="إشعارات البريد الإلكتروني"
          description="تفضيل مُخزَّن - محدود حالياً بإعادة تعيين كلمة المرور"
          checked={watch("emailNotificationsEnabled")}
          onCheckedChange={(checked) => setValue("emailNotificationsEnabled", checked, { shouldDirty: true })}
          disabled={readOnly}
        />
        <ToggleRow
          id="settings-sms-notifications"
          label="إشعارات SMS"
          description="تفضيل مُخزَّن - بلا بنية إرسال فعلية حتى الآن"
          checked={watch("smsNotificationsEnabled")}
          onCheckedChange={(checked) => setValue("smsNotificationsEnabled", checked, { shouldDirty: true })}
          disabled={readOnly}
        />
        <ToggleRow
          id="settings-in-app-notifications"
          label="الإشعارات داخل التطبيق"
          description="تفضيل مُخزَّن"
          checked={watch("inAppNotificationsEnabled")}
          onCheckedChange={(checked) => setValue("inAppNotificationsEnabled", checked, { shouldDirty: true })}
          disabled={readOnly}
        />
      </CardContent>
    </Card>
  );
}
