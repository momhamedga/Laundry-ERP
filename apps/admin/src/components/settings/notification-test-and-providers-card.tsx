"use client";

import { CheckCircle2, Send, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useProviderStatusQuery,
  useSendTestNotificationMutation,
} from "@/hooks/use-notifications";
import { usePermissions } from "@/hooks/use-permissions";
import type { NotificationChannel } from "@/types/notification";

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  IN_APP: "داخل التطبيق",
  EMAIL: "البريد الإلكتروني",
  SMS: "الرسائل النصية",
  WHATSAPP: "واتساب",
  PUSH: "الإشعارات الفورية",
};

/** الحالة حقيقية من ChannelRegistry بالخادم (notifications:manage) - وليست قيماً ثابتة بالواجهة */
export function NotificationTestAndProvidersCard() {
  const { can } = usePermissions();
  const canManage = can("notifications:manage");
  const { data: providers, isLoading } = useProviderStatusQuery(canManage);
  const sendTest = useSendTestNotificationMutation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">اختبار الإشعارات وحالة المزوّدين</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">إرسال إشعار اختباري</p>
            <p className="text-xs text-muted-foreground">
              يظهر داخل الجرس فوراً، ويُرسَل بالبريد أيضاً إن كانت قناة البريد العامة مفعّلة
            </p>
          </div>
          <Button size="sm" onClick={() => sendTest.mutate()} disabled={sendTest.isPending}>
            <Send aria-hidden /> إرسال إشعار اختباري
          </Button>
        </div>

        {canManage && (
          <div>
            <p className="mb-2 text-sm font-medium">حالة المزوّدين</p>
            {isLoading || !providers ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(providers) as NotificationChannel[]).map((channel) => {
                  const configured = providers[channel].configured;
                  return (
                    <div
                      key={channel}
                      className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm"
                    >
                      <span>{CHANNEL_LABELS[channel]}</span>
                      {configured ? (
                        <Badge className="gap-1 bg-success/15 text-success">
                          <CheckCircle2 className="size-3" aria-hidden /> مُهيَّأ
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-muted-foreground">
                          <XCircle className="size-3" aria-hidden /> غير مُهيَّأ
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
