import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomersListSkeleton } from "@/components/customers/customers-list-skeleton";
import { CustomersView } from "@/components/customers/customers-view";

export const metadata: Metadata = { title: "العملاء" };

export default function CustomersPage() {
  return (
    <Suspense fallback={<CustomersListSkeleton />}>
      <CustomersView />
    </Suspense>
  );
}
