import type { Metadata } from "next";
import { Suspense } from "react";
import { BranchesListSkeleton } from "@/components/branches/branches-list-skeleton";
import { BranchesView } from "@/components/branches/branches-view";

export const metadata: Metadata = { title: "الفروع" };

export default function Page() {
  return (
    <Suspense fallback={<BranchesListSkeleton />}>
      <BranchesView />
    </Suspense>
  );
}
