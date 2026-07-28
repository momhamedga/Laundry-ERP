"use client";

import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationStatisticsQuery } from "@/hooks/use-notifications";

const STAT_LABELS: { key: "unread" | "today" | "thisWeek" | "thisMonth" | "sent" | "failed" | "pending" | "archived"; label: string }[] = [
  { key: "unread", label: "غير مقروءة" },
  { key: "today", label: "اليوم" },
  { key: "thisWeek", label: "هذا الأسبوع" },
  { key: "thisMonth", label: "هذا الشهر" },
  { key: "sent", label: "تم الإرسال" },
  { key: "failed", label: "فشل" },
  { key: "pending", label: "قيد الانتظار" },
  { key: "archived", label: "مؤرشفة" },
];

/** إحصاءات ذاتية حقيقية (إشعارات/تسليمات المستخدم الحالي فقط) - notifications:read */
export function NotificationStatisticsCard() {
  const { data: stats, isLoading } = useNotificationStatisticsQuery();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <BarChart3 className="size-4" aria-hidden /> إحصاءاتي
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isLoading || !stats
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          : STAT_LABELS.map((item) => (
              <div key={item.key} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-lg font-semibold">{stats[item.key]}</p>
              </div>
            ))}
      </CardContent>
    </Card>
  );
}
