"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrdersTrendQuery } from "@/hooks/use-dashboard";
import { getErrorMessage } from "@/lib/axios";

/**
 * عدد الطلبات لكل يوم من آخر 7 أيام - لا Endpoint إحصائي جديد
 * (7 استدعاءات خفيفة لـ GET /orders، راجع useOrdersTrendQuery)
 */
export function OrdersTrendChart() {
  const { data, isLoading, isError, error, refetch } = useOrdersTrendQuery();

  return (
    <Card>
      <CardHeader>
        <CardTitle>اتجاه الطلبات</CardTitle>
        <CardDescription>عدد الطلبات المستلمة خلال آخر 7 أيام</CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : isLoading || !data ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : (
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    color: "var(--popover-foreground)",
                  }}
                  formatter={(value) => [`${value}`, "الطلبات"]}
                />
                <Bar dataKey="orders" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
