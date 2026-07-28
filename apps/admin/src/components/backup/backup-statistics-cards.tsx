"use client";

import { Archive, CheckCircle2, Clock, Database, HardDrive, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { useBackupStatisticsQuery } from "@/hooks/use-backup";
import { formatBytes, formatDuration } from "./backup-format";

interface StatItem {
  key: string;
  label: string;
  value: string;
  icon: typeof Database;
  tone?: "default" | "success" | "danger";
}

export function BackupStatisticsCards() {
  const { data, isLoading } = useBackupStatisticsQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  if (!data) return null;

  const items: StatItem[] = [
    { key: "total", label: "إجمالي النسخ", value: String(data.total), icon: Database },
    { key: "successful", label: "الناجحة", value: String(data.successful), icon: CheckCircle2, tone: "success" },
    { key: "failed", label: "الفاشلة", value: String(data.failed), icon: XCircle, tone: data.failed > 0 ? "danger" : "default" },
    { key: "storage", label: "المساحة المستخدمة", value: formatBytes(data.storageUsedBytes), icon: HardDrive },
    { key: "avgSize", label: "متوسط الحجم", value: formatBytes(data.averageSizeBytes), icon: Archive },
    { key: "avgDuration", label: "متوسط المدة", value: formatDuration(data.averageDurationMs), icon: Clock },
    { key: "last", label: "آخر نسخة", value: formatDateTime(data.lastBackupAt), icon: Clock },
    { key: "next", label: "النسخة القادمة", value: formatDateTime(data.nextBackupAt), icon: Clock },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key}>
            <CardContent className="flex items-start justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 truncate text-lg font-bold" title={item.value}>
                  {item.value}
                </p>
              </div>
              <Icon
                aria-hidden
                className={
                  item.tone === "success"
                    ? "size-5 shrink-0 text-emerald-500"
                    : item.tone === "danger"
                      ? "size-5 shrink-0 text-destructive"
                      : "size-5 shrink-0 text-muted-foreground"
                }
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
