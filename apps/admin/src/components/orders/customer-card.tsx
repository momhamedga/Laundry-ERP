"use client";

import { ClipboardList, MapPin, Phone, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import { useCustomerProfileQuery } from "@/hooks/use-customers";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CustomerCardProps {
  customerId: string;
}

/**
 * بطاقة العميل المختار - الاسم/الهاتف/العنوان/عدد الطلبات/الرصيد الحالي/الحالة
 * تُبنى من GET /customers/:id/profile (يعيد استخدام useCustomerProfileQuery الموجود)
 */
export function CustomerCard({ customerId }: CustomerCardProps) {
  const { data, isLoading, isError, error, refetch } = useCustomerProfileQuery(customerId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="pt-4">
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        </CardContent>
      </Card>
    );
  }

  const { customer, stats } = data;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{customer.name}</CardTitle>
        <CustomerStatusBadge isActive={customer.isActive} />
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="size-4 text-muted-foreground" aria-hidden />
          <span dir="ltr">{customer.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm sm:col-span-2">
          <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>{customer.address ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ClipboardList className="size-4 text-muted-foreground" aria-hidden />
          <span>{stats.totalOrders} طلب</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Wallet className="size-4 text-muted-foreground" aria-hidden />
          <span className={cn("font-medium", stats.balanceDue > 0 && "text-destructive")}>
            {formatCurrency(stats.balanceDue)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
