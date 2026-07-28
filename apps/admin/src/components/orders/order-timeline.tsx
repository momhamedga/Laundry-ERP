"use client";

import { Clock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrderHistoryQuery } from "@/hooks/use-orders";
import { getOrderStatusMeta } from "@/lib/order-status";
import { formatDateTime } from "@/lib/format";

/** المسار الزمني لتغييرات حالة الطلب - GET /orders/:id/history */
export function OrderTimeline({ orderId }: { orderId: string }) {
  const { data, isLoading, isError } = useOrderHistoryQuery(orderId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-muted-foreground">تعذر تحميل السجل الزمني</p>;
  }

  if (!data || data.length === 0) {
    return <EmptyState icon={Clock} title="لا يوجد سجل تغييرات بعد" />;
  }

  return (
    <ol className="space-y-4 border-e-2 border-border ps-4">
      {data.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute -end-[1.4rem] top-1 size-2.5 rounded-full bg-primary" aria-hidden />
          <p className="text-sm font-medium">
            {entry.oldStatus ? (
              <>
                {getOrderStatusMeta(entry.oldStatus).label} ←{" "}
                {getOrderStatusMeta(entry.newStatus).label}
              </>
            ) : (
              <>تم إنشاء الطلب — {getOrderStatusMeta(entry.newStatus).label}</>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            بواسطة {entry.changedBy.name} · {formatDateTime(entry.createdAt)}
          </p>
          {entry.notes && <p className="mt-1 text-sm text-muted-foreground">{entry.notes}</p>}
        </li>
      ))}
    </ol>
  );
}
