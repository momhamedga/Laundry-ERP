import type { Metadata } from "next";
import { Suspense } from "react";
import { PurchasesView } from "@/components/purchases/purchases-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "المشتريات" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <PurchasesView />
    </Suspense>
  );
}
