import type { Metadata } from "next";
import { Suspense } from "react";
import { LoyaltyView } from "@/components/loyalty/loyalty-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "الولاء والنقاط" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <LoyaltyView />
    </Suspense>
  );
}
