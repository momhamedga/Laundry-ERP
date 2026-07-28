"use client";

import {
  Ban,
  CheckCircle2,
  Clock,
  CreditCard,
  ShoppingCart,
  Users,
  Wallet,
  Wallet2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MetricCard } from "@/components/cards/metric-card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useActiveCustomersCountQuery,
  useDashboardStatsQuery,
  useTodayPaymentsCountQuery,
} from "@/hooks/use-dashboard";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency } from "@/lib/format";

interface KpiDef {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "destructive";
}

function KpiSkeletons({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[74px] rounded-xl" />
      ))}
    </>
  );
}

/**
 * شبكة مؤشرات لوحة التحكم - تعيد استخدام MetricCard حرفياً (بلا Trend وهمي؛
 * الخادم لا يعيد نسبة تغيّر عن فترة سابقة، فلا نختلقها كما كان بالـ Mock)
 * 6 من 8 مؤشرات مصدرها استعلام واحد (GET /stats/dashboard)، ومؤشران
 * (العملاء النشطون/مدفوعات اليوم) لهما استعلامان مستقلان حقيقيان
 */
export function DashboardKpis() {
  const stats = useDashboardStatsQuery();
  const activeCustomers = useActiveCustomersCountQuery();
  const paymentsToday = useTodayPaymentsCountQuery();

  if (stats.isError) {
    return (
      <ErrorState
        title="تعذر تحميل مؤشرات لوحة التحكم"
        description={getErrorMessage(stats.error)}
        onRetry={() => void stats.refetch()}
      />
    );
  }

  if (stats.isLoading || !stats.data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiSkeletons count={8} />
      </div>
    );
  }

  const completedOrders =
    stats.data.ordersByStatus.find((s) => s.status === "DELIVERED")?.count ?? 0;
  const cancelledOrders =
    stats.data.ordersByStatus.find((s) => s.status === "CANCELLED")?.count ?? 0;

  const kpis: KpiDef[] = [
    { title: "طلبات اليوم", value: String(stats.data.today.orders), icon: ShoppingCart },
    {
      title: "إيراد اليوم",
      value: formatCurrency(stats.data.today.revenue),
      icon: CreditCard,
      tone: "success",
    },
    {
      title: "طلبات قيد التنفيذ",
      value: String(stats.data.operations.activeOrders),
      icon: Clock,
      tone: "warning",
    },
    { title: "طلبات مكتملة", value: String(completedOrders), icon: CheckCircle2, tone: "success" },
    { title: "طلبات ملغاة", value: String(cancelledOrders), icon: Ban, tone: "destructive" },
    {
      title: "الرصيد المستحق",
      value: formatCurrency(stats.data.financial.unpaidBalance),
      icon: Wallet,
      tone: stats.data.financial.unpaidBalance > 0 ? "warning" : "default",
    },
    {
      title: "عملاء نشطون",
      value: activeCustomers.isLoading ? "…" : String(activeCustomers.data ?? "—"),
      icon: Users,
    },
    {
      title: "مدفوعات اليوم",
      value: paymentsToday.isLoading ? "…" : String(paymentsToday.data ?? "—"),
      icon: Wallet2,
      tone: "success",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <MetricCard key={kpi.title} title={kpi.title} value={kpi.value} icon={kpi.icon} tone={kpi.tone} />
      ))}
    </div>
  );
}
