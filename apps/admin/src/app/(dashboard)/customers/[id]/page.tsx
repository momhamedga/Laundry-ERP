import type { Metadata } from "next";
import { CustomerDetailsView } from "@/components/customers/customer-details-view";

interface CustomerDetailsPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "تفاصيل العميل" };

export default async function CustomerDetailsPage({ params }: CustomerDetailsPageProps) {
  const { id } = await params;
  return <CustomerDetailsView customerId={id} />;
}
