import type { Metadata } from "next";
import { DeliveriesView } from "@/components/deliveries/deliveries-view";

export const metadata: Metadata = { title: "تسليمات اليوم" };

export default function DeliveriesPage() {
  return <DeliveriesView />;
}
