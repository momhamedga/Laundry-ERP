import type { Metadata } from "next";
import { Suspense } from "react";
import { MembershipView } from "@/components/membership/membership-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "العضوية" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <MembershipView />
    </Suspense>
  );
}
