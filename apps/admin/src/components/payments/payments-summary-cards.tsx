"use client";

import { CheckCircle2, Clock, CreditCard, RotateCcw } from "lucide-react";
import { MetricCard } from "@/components/cards/metric-card";
import { usePaymentsQuery } from "@/hooks/use-payments";

/**
 * بطاقات ملخص عامة (بلا صلة بالفلاتر النشطة بالجدول) - محسوبة من usePaymentsQuery
 * نفسه بحدود limit=1 لكل حالة (meta.total فقط) - بلا أي Endpoint إحصائي جديد،
 * بنفس نمط بطاقات Services/Categories (Phase 8ه)
 */
export function PaymentsSummaryCards() {
  const total = usePaymentsQuery({ limit: 1 });
  const completed = usePaymentsQuery({ limit: 1, status: "COMPLETED" });
  const pending = usePaymentsQuery({ limit: 1, status: "PENDING" });
  const refunded = usePaymentsQuery({ limit: 1, status: "REFUNDED" });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="إجمالي المدفوعات"
        value={String(total.data?.meta.total ?? "—")}
        icon={CreditCard}
      />
      <MetricCard
        title="مكتملة"
        value={String(completed.data?.meta.total ?? "—")}
        icon={CheckCircle2}
        tone="success"
      />
      <MetricCard
        title="قيد الانتظار"
        value={String(pending.data?.meta.total ?? "—")}
        icon={Clock}
        tone="warning"
      />
      <MetricCard
        title="مستردة"
        value={String(refunded.data?.meta.total ?? "—")}
        icon={RotateCcw}
        tone="destructive"
      />
    </div>
  );
}
