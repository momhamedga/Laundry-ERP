import type { Metadata } from "next";
import { Suspense } from "react";
import { ServicesListSkeleton } from "@/components/services/services-list-skeleton";
import { ServicesView } from "@/components/services/services-view";

export const metadata: Metadata = { title: "الخدمات" };

export default function ServicesPage() {
  return (
    <Suspense fallback={<ServicesListSkeleton />}>
      <ServicesView />
    </Suspense>
  );
}
