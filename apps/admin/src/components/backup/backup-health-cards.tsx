"use client";

import { AlertTriangle, CheckCircle2, CloudOff, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBackupHealthQuery } from "@/hooks/use-backup";
import type { HealthLevel } from "@/types/backup";
import { HealthLevelBadge } from "./backup-status-badge";

const LEVEL_ICON: Record<HealthLevel, typeof CheckCircle2> = {
  HEALTHY: CheckCircle2,
  WARNING: AlertTriangle,
  CRITICAL: XCircle,
};

const LEVEL_COLOR: Record<HealthLevel, string> = {
  HEALTHY: "text-emerald-500",
  WARNING: "text-amber-500",
  CRITICAL: "text-destructive",
};

const PROVIDER_LABEL: Record<string, string> = {
  LOCAL: "محلي",
  S3: "Amazon S3",
  R2: "Cloudflare R2",
  BACKBLAZE: "Backblaze",
};

export function BackupHealthCards() {
  const { data, isLoading } = useBackupHealthQuery();

  if (isLoading) return <Skeleton className="h-56 w-full" />;
  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>صحة النظام</CardTitle>
            <CardDescription>حالة التخزين والجدولة والمزوّدات</CardDescription>
          </div>
          <HealthLevelBadge level={data.level} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {data.checks.map((check) => {
            const Icon = LEVEL_ICON[check.level];
            return (
              <li key={check.key} className="flex items-start gap-2 rounded-lg border px-3 py-2">
                <Icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${LEVEL_COLOR[check.level]}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="break-words text-xs text-muted-foreground">{check.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div>
          <p className="mb-2 text-sm font-medium">المزوّدات</p>
          <div className="flex flex-wrap gap-2">
            {data.providers.map((p) => (
              <span
                key={p.provider}
                className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs"
                title={p.credentialsDetected ? "رُصدت أسرار بالبيئة" : "بلا أسرار"}
              >
                {p.configured ? (
                  <CheckCircle2 aria-hidden className="size-3.5 text-emerald-500" />
                ) : (
                  <CloudOff aria-hidden className="size-3.5 text-muted-foreground" />
                )}
                {PROVIDER_LABEL[p.provider] ?? p.provider}
                <span className="text-muted-foreground">
                  {p.configured ? "مُهيّأ" : p.credentialsDetected ? "بانتظار التكامل" : "غير مُهيّأ"}
                </span>
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
