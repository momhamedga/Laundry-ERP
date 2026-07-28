import type { Metadata } from "next";
import { Suspense } from "react";
import { DayClosingView } from "@/components/day-closing/day-closing-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "إغلاق اليوم" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <DayClosingView />
    </Suspense>
  );
}
