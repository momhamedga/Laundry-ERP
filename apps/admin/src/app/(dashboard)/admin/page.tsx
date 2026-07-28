import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminView } from "@/components/admin/admin-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "الإدارة والأمان" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <AdminView />
    </Suspense>
  );
}
