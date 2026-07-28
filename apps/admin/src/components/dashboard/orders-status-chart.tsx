"use client";

import { ChartBar } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStatsQuery } from "@/hooks/use-dashboard";
import { getErrorMessage } from "@/lib/axios";
import { getOrderStatusMeta } from "@/lib/order-status";

/** توزيع الطلبات على الحالات - من نفس استعلام GET /stats/dashboard (RQ يشارك الكاش، لا استدعاء إضافي) */
export function OrdersStatusChart() {
  const { data, isLoading, isError, error, refetch } = useDashboardStatsQuery();

  const chartData = data?.ordersByStatus
    .filter((s) => s.count > 0)
    .map((s) => ({ label: getOrderStatusMeta(s.status).label, count: s.count }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>الطلبات حسب الحالة</CardTitle>
        <CardDescription>توزيع كل الطلبات على مراحل خط السير</CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : isLoading || !data ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : !chartData || chartData.length === 0 ? (
          <EmptyState icon={ChartBar} title="لا توجد طلبات بعد" />
        ) : (
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    color: "var(--popover-foreground)",
                  }}
                  formatter={(value) => [`${value}`, "طلب"]}
                />
                <Bar dataKey="count" fill="var(--chart-3)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
