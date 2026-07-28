"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/ui/error-state";
import { useCustomerProfileQuery } from "@/hooks/use-customers";
import { CustomerDetailsSkeleton } from "./customer-details-skeleton";
import { CustomerNotesCard } from "./customer-notes-card";
import { CustomerProfileCard } from "./customer-profile-card";
import { CustomerRecentOrders } from "./customer-recent-orders";
import { CustomerStatsCards } from "./customer-stats-cards";
import { DeleteCustomerDialog } from "./delete-customer-dialog";
import { EditCustomerDialog } from "./edit-customer-dialog";
import { RestoreCustomerDialog } from "./restore-customer-dialog";

export function CustomerDetailsView({ customerId }: { customerId: string }) {
  const { data, isLoading, isError, refetch } = useCustomerProfileQuery(customerId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  if (isLoading) return <CustomerDetailsSkeleton />;

  if (isError || !data) {
    return (
      <ErrorState
        title="تعذر تحميل بيانات العميل"
        description="قد يكون العميل غير موجود أو حدث خطأ بالاتصال"
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/customers"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden />
          العودة لقائمة العملاء
        </Link>
        <PageHeader title={data.customer.name} description="تفاصيل العميل وسجل طلباته" />
      </div>

      <CustomerProfileCard
        customer={data.customer}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onRestore={() => setRestoreOpen(true)}
      />

      <CustomerStatsCards stats={data.stats} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CustomerRecentOrders orders={data.recentOrders} />
        </div>
        <CustomerNotesCard customerId={data.customer.id} notes={data.customer.notes} />
      </div>

      <EditCustomerDialog customer={data.customer} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteCustomerDialog
        customer={data.customer}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
      <RestoreCustomerDialog
        customer={data.customer}
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
      />
    </div>
  );
}
