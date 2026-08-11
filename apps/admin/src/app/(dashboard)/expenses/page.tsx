import type { Metadata } from "next";
import { Suspense } from "react";
import { ExpensesView } from "@/components/expenses/expenses-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "المصروفات" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <ExpensesView />
    </Suspense>
  );
}
