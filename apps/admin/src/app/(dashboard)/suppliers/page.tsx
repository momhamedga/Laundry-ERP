import type { Metadata } from "next";
import { Suspense } from "react";
import { SuppliersView } from "@/components/suppliers/suppliers-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "الموردون" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <SuppliersView />
    </Suspense>
  );
}
