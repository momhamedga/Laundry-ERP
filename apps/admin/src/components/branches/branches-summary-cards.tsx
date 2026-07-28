"use client";

import { Building2, CheckCircle2, XCircle } from "lucide-react";
import { MetricCard } from "@/components/cards/metric-card";
import { useBranchesQuery } from "@/hooks/use-branches";

/**
 * بطاقات ملخص عامة (بلا صلة بالفلاتر النشطة بالجدول) - محسوبة من useBranchesQuery
 * نفسه بحدود limit=1 لكل حالة (meta.total فقط) - بلا أي Endpoint إحصائي جديد،
 * بنفس نمط بطاقات Payments/Services
 */
export function BranchesSummaryCards() {
  const total = useBranchesQuery({ limit: 1 });
  const active = useBranchesQuery({ limit: 1, isActive: true });
  const inactive = useBranchesQuery({ limit: 1, isActive: false });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard
        title="إجمالي الفروع"
        value={String(total.data?.meta.total ?? "—")}
        icon={Building2}
      />
      <MetricCard
        title="نشطة"
        value={String(active.data?.meta.total ?? "—")}
        icon={CheckCircle2}
        tone="success"
      />
      <MetricCard
        title="معطلة"
        value={String(inactive.data?.meta.total ?? "—")}
        icon={XCircle}
        tone="destructive"
      />
    </div>
  );
}
