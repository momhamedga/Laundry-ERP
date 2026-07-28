import type { Metadata } from "next";
import { Suspense } from "react";
import { InventoryView } from "@/components/inventory/inventory-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "المخزون" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <InventoryView />
    </Suspense>
  );
}
