import type { Metadata } from "next";
import { Suspense } from "react";
import { HrView } from "@/components/hr/hr-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "الموارد البشرية" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <HrView />
    </Suspense>
  );
}
