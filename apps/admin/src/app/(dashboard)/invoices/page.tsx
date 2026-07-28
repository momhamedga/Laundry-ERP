import type { Metadata } from "next";
import { Suspense } from "react";
import { InvoiceSkeleton } from "@/components/invoices/invoice-skeleton";
import { InvoiceView } from "@/components/invoices/invoice-view";

export const metadata: Metadata = { title: "الفواتير" };

export default function Page() {
  return (
    <Suspense fallback={<InvoiceSkeleton variant="list" />}>
      <InvoiceView />
    </Suspense>
  );
}
