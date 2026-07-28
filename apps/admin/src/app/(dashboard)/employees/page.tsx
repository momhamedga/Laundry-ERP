import type { Metadata } from "next";
import { Suspense } from "react";
import { EmployeesView } from "@/components/employees/employees-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "الموظفون" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <EmployeesView />
    </Suspense>
  );
}
