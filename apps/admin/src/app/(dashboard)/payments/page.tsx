import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentsListSkeleton } from "@/components/payments/payments-list-skeleton";
import { PaymentsView } from "@/components/payments/payments-view";

export const metadata: Metadata = { title: "المدفوعات" };

export default function Page() {
  return (
    <Suspense fallback={<PaymentsListSkeleton />}>
      <PaymentsView />
    </Suspense>
  );
}
