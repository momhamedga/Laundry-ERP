"use client";

import { ClipboardList, ShieldOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { RecentOrdersTable } from "@/components/tables/recent-orders-table";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStatsQuery, useRecentOrdersQuery } from "@/hooks/use-dashboard";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import { DashboardKpis } from "./dashboard-kpis";
import { OrdersStatusChart } from "./orders-status-chart";
import { OrdersTrendChart } from "./orders-trend-chart";
import { PaymentsMethodChart } from "./payments-method-chart";
import { TopCategoriesCard } from "./top-categories-card";
import { TopServicesCard } from "./top-services-card";

/** جدول آخر الطلبات كـ Widget مستقل - تحميل/خطأ/فراغ خاصان به بلا كسر باقي الصفحة */
function RecentOrdersWidget() {
  const { data, isLoading, isError, error, refetch } = useRecentOrdersQuery();

  if (isError) {
    return <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }
  if (isLoading || !data) {
    return <Skeleton className="h-80 rounded-xl" />;
  }
  if (data.length === 0) {
    return <EmptyState icon={ClipboardList} title="لا توجد طلبات بعد" />;
  }
  return <RecentOrdersTable orders={data} />;
}

/** مخطط الإيراد كـ Widget مستقل - نفس استعلام GET /stats/dashboard (كاش مشترك) */
function RevenueTrendWidget() {
  const { data, isLoading, isError, error, refetch } = useDashboardStatsQuery();

  if (isError) {
    return <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }
  if (isLoading || !data) {
    return <Skeleton className="h-80 rounded-xl" />;
  }
  return <RevenueChart data={data.revenueLast7Days} />;
}

/**
 * لوحة التحكم الرئيسية - كل Widget يحمّل بيانته باستعلام مستقل، فشل واحد
 * لا يُسقط الصفحة كلها. Gate كامل على reports:view (نفس صلاحية GET
 * /stats/dashboard بالخادم) - بلا هذه الصلاحية تُعرض رسالة صريحة بدل
 * محاولات 403 صامتة لكل الـ Widgets
 */
export function DashboardView() {
  const { can } = usePermissions();

  if (!can("reports:view")) {
    return (
      <div className="space-y-6">
        <PageHeader title="لوحة التحكم" description="نظرة عامة على أداء المغسلة اليوم" />
        <EmptyState
          icon={ShieldOff}
          title="لوحة التحكم متاحة للمدراء فقط"
          description="لا تملك صلاحية عرض التقارير والإحصائيات (reports:view)"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="لوحة التحكم" description="نظرة عامة على أداء المغسلة اليوم" />

      <DashboardKpis />

      <div className="grid gap-4 xl:grid-cols-2">
        <RevenueTrendWidget />
        <OrdersTrendChart />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <OrdersStatusChart />
        <PaymentsMethodChart />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TopServicesCard />
        <TopCategoriesCard />
      </div>

      <RecentOrdersWidget />
    </div>
  );
}
