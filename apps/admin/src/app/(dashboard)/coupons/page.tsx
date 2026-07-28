import type { Metadata } from "next";
import { Suspense } from "react";
import { CouponsView } from "@/components/coupons/coupons-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "الكوبونات" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <CouponsView />
    </Suspense>
  );
}
