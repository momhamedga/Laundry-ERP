"use client";

import { CheckCircle2, Clock, FileText, Send } from "lucide-react";
import { MetricCard } from "@/components/cards/metric-card";
import { useInvoicesQuery } from "@/hooks/use-invoices";

/**
 * بطاقات ملخص عامة (بلا صلة بالفلاتر النشطة بالجدول) - محسوبة من
 * useInvoicesQuery نفسه بحدود limit=1 لكل حالة (meta.total فقط) - بلا أي
 * Endpoint إحصائي جديد (لا summary بالخادم لهذه القائمة)، بنفس نمط PaymentsSummaryCards
 */
export function InvoiceSummaryCards() {
  const total = useInvoicesQuery({ limit: 1 });
  const issued = useInvoicesQuery({ limit: 1, status: "ISSUED" });
  const partiallyPaid = useInvoicesQuery({ limit: 1, status: "PARTIALLY_PAID" });
  const paid = useInvoicesQuery({ limit: 1, status: "PAID" });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="إجمالي الفواتير" value={String(total.data?.meta.total ?? "—")} icon={FileText} />
      <MetricCard
        title="صادرة"
        value={String(issued.data?.meta.total ?? "—")}
        icon={Send}
        tone="default"
      />
      <MetricCard
        title="مدفوعة جزئياً"
        value={String(partiallyPaid.data?.meta.total ?? "—")}
        icon={Clock}
        tone="warning"
      />
      <MetricCard
        title="مدفوعة بالكامل"
        value={String(paid.data?.meta.total ?? "—")}
        icon={CheckCircle2}
        tone="success"
      />
    </div>
  );
}
