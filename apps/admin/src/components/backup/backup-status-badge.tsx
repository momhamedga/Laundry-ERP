import { Badge } from "@/components/ui/badge";
import type { BackupStatus, HealthLevel } from "@/types/backup";

const STATUS_META: Record<BackupStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "قيد الانتظار", variant: "outline" },
  IN_PROGRESS: { label: "جارٍ التنفيذ", variant: "secondary" },
  COMPLETED: { label: "مكتملة", variant: "default" },
  FAILED: { label: "فشلت", variant: "destructive" },
};

export function BackupStatusBadge({ status }: { status: BackupStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const HEALTH_META: Record<HealthLevel, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  HEALTHY: { label: "سليم", variant: "default" },
  WARNING: { label: "تحذير", variant: "secondary" },
  CRITICAL: { label: "حرج", variant: "destructive" },
};

export function HealthLevelBadge({ level }: { level: HealthLevel }) {
  const meta = HEALTH_META[level];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
