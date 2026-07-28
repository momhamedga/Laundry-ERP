"use client";

import { CreditCard } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
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
import { usePaymentsByMethodQuery } from "@/hooks/use-dashboard";
import { getErrorMessage } from "@/lib/axios";
import type { PaymentMethod } from "@/types/payment";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "نقدي",
  CARD: "بطاقة",
  BANK_TRANSFER: "تحويل بنكي",
  MOBILE_WALLET: "محفظة إلكترونية",
};

const METHOD_COLORS: Record<PaymentMethod, string> = {
  CASH: "var(--chart-1)",
  CARD: "var(--chart-2)",
  BANK_TRANSFER: "var(--chart-3)",
  MOBILE_WALLET: "var(--chart-4)",
};

/** عدد المدفوعات لكل طريقة دفع (كل الوقت) - لا Endpoint إحصائي جديد، راجع usePaymentsByMethodQuery */
export function PaymentsMethodChart() {
  const { data, isLoading, isError, error, refetch } = usePaymentsByMethodQuery();

  const chartData = data
    ?.filter((d) => d.count > 0)
    .map((d) => ({ name: METHOD_LABELS[d.method], value: d.count, method: d.method }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>المدفوعات حسب الطريقة</CardTitle>
        <CardDescription>عدد المدفوعات المُسجَّلة لكل طريقة دفع</CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : isLoading || !data ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : !chartData || chartData.length === 0 ? (
          <EmptyState icon={CreditCard} title="لا توجد مدفوعات بعد" />
        ) : (
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.method} fill={METHOD_COLORS[entry.method]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    color: "var(--popover-foreground)",
                  }}
                  formatter={(value, name) => [`${value}`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
