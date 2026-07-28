"use client";

import { ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from "@/hooks/use-notifications";
import type {
  ChannelSettings,
  NotificationPreferenceChannels,
  NotificationType,
} from "@/types/notification";

interface NotificationTypePreferencesCardProps {
  channelSettings: ChannelSettings;
  readOnly: boolean;
}

/** كل الأنواع القابلة للتخصيص - TEST مُستثنى عمداً (لا صف تفضيل له، راجع الخادم) */
const TYPE_ROWS: { type: NotificationType; label: string }[] = [
  { type: "ORDER_CREATED", label: "طلب جديد" },
  { type: "ORDER_STATUS_CHANGED", label: "تغيير حالة الطلب" },
  { type: "ORDER_CANCELLED", label: "إلغاء الطلب" },
  { type: "PAYMENT_RECEIVED", label: "دفعة مستلمة" },
  { type: "PAYMENT_REFUNDED", label: "استرداد دفعة" },
  { type: "PAYMENT_CANCELLED", label: "إلغاء دفعة" },
  { type: "INVOICE_CREATED", label: "فاتورة جديدة" },
  { type: "INVOICE_SENT", label: "إرسال فاتورة" },
  { type: "BACKUP_COMPLETED", label: "اكتمال نسخة احتياطية" },
  { type: "BACKUP_FAILED", label: "فشل نسخة احتياطية" },
  { type: "NEW_DEVICE_LOGIN", label: "تسجيل دخول جهاز جديد" },
  { type: "ACCOUNT_LOCKED", label: "قفل الحساب" },
  { type: "PASSWORD_RESET", label: "إعادة تعيين كلمة المرور" },
  { type: "SYSTEM_SETTINGS_UPDATED", label: "تحديث إعدادات النظام" },
  { type: "USER_CREATED", label: "إنشاء مستخدم" },
  { type: "USER_DISABLED", label: "تعطيل مستخدم" },
];

const CHANNEL_COLUMNS: { key: keyof NotificationPreferenceChannels; label: string; globalKey: keyof ChannelSettings }[] = [
  { key: "inApp", label: "التطبيق", globalKey: "globalInApp" },
  { key: "email", label: "البريد", globalKey: "globalEmail" },
  { key: "sms", label: "SMS", globalKey: "globalSms" },
  { key: "whatsapp", label: "واتساب", globalKey: "globalWhatsapp" },
  { key: "push", label: "Push", globalKey: "globalPush" },
];

/**
 * حفظ فوري لكل مفتاح (partialRecord بالخادم يقبل نوعاً واحداً بلا التأثير على
 * البقية) - بلا زر حفظ منفصل، مناسب لمصفوفة 16×5 مفاتيح
 */
export function NotificationTypePreferencesCard({
  channelSettings,
  readOnly,
}: NotificationTypePreferencesCardProps) {
  const { data: preferences, isLoading } = useNotificationPreferencesQuery();
  const mutation = useUpdateNotificationPreferencesMutation();

  function toggle(type: NotificationType, channel: keyof NotificationPreferenceChannels, checked: boolean) {
    const current = preferences?.[type];
    if (!current) return;
    mutation.mutate({ [type]: { ...current, [channel]: checked } });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <ListChecks className="size-4" aria-hidden /> تفضيلات كل نوع إشعار
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {isLoading || !preferences ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="p-3 text-start font-medium">النوع</th>
                {CHANNEL_COLUMNS.map((col) => (
                  <th key={col.key} className="p-3 text-center font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TYPE_ROWS.map((row) => {
                const rowPrefs = preferences[row.type];
                return (
                  <tr key={row.type} className="border-b last:border-b-0 hover:bg-accent/30">
                    <td className="p-3">{row.label}</td>
                    {CHANNEL_COLUMNS.map((col) => {
                      const globalOff = !channelSettings[col.globalKey];
                      return (
                        <td key={col.key} className="p-3 text-center">
                          <Switch
                            checked={rowPrefs[col.key]}
                            onCheckedChange={(checked) => toggle(row.type, col.key, checked)}
                            disabled={readOnly || globalOff}
                            aria-label={`${row.label} - ${col.label}`}
                            title={globalOff ? "القناة مُعطَّلة عمومياً" : undefined}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
