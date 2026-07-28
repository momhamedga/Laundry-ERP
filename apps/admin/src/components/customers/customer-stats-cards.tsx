import { CircleDollarSign, ClipboardList, ListChecks, Wallet } from "lucide-react";
import { MetricCard } from "@/components/cards/metric-card";
import { formatCurrency } from "@/lib/format";
import type { CustomerStats } from "@/types/customer";

/** Customer Statistics - تُحسب من القاعدة مباشرة بالخادم عند كل طلب */
export function CustomerStatsCards({ stats }: { stats: CustomerStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="إجمالي الطلبات" value={String(stats.totalOrders)} icon={ClipboardList} />
      <MetricCard
        title="الطلبات النشطة"
        value={String(stats.activeOrders)}
        icon={ListChecks}
        tone="warning"
      />
      <MetricCard
        title="إجمالي الإنفاق"
        value={formatCurrency(stats.totalSpent)}
        icon={CircleDollarSign}
        tone="success"
      />
      <MetricCard
        title="الرصيد المستحق"
        value={formatCurrency(stats.balanceDue)}
        icon={Wallet}
        tone={stats.balanceDue > 0 ? "destructive" : "default"}
      />
    </div>
  );
}
