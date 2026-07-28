import type { Metadata } from "next";
import { Suspense } from "react";
import { BarcodeView } from "@/components/barcode/barcode-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "الباركود و QR" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <BarcodeView />
    </Suspense>
  );
}
