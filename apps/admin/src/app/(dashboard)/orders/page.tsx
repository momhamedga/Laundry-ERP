import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersListSkeleton } from "@/components/orders/orders-list-skeleton";
import { OrdersView } from "@/components/orders/orders-view";

export const metadata: Metadata = { title: "الطلبات" };

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersListSkeleton />}>
      <OrdersView />
    </Suspense>
  );
}
