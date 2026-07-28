"use client";

import { Users } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DataPagination } from "@/components/tables/data-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PAGE_SIZE_OPTIONS } from "@/constants/customers";
import { useCustomersQuery } from "@/hooks/use-customers";
import { useCustomersFilters } from "@/hooks/use-customers-filters";
import type { Customer } from "@/types/customer";
import { CustomersTable } from "./customers-table";
import { CustomersToolbar } from "./customers-toolbar";
import { DeleteCustomerDialog } from "./delete-customer-dialog";
import { EditCustomerDialog } from "./edit-customer-dialog";
import { RestoreCustomerDialog } from "./restore-customer-dialog";

/** جسم صفحة قائمة العملاء - يستخدم useSearchParams لذا يُستدعى داخل Suspense من page.tsx */
export function CustomersView() {
  const { filters, setFilters, resetFilters } = useCustomersFilters();
  const { data, isLoading, isError, refetch } = useCustomersQuery(filters);

  const [searchResetKey, setSearchResetKey] = useState(0);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Customer | null>(null);

  const hasActiveFilters = !!(
    filters.search ||
    filters.isActive !== undefined ||
    filters.createdFrom ||
    filters.createdTo
  );

  function handleReset() {
    resetFilters();
    setSearchResetKey((k) => k + 1);
  }

  function handleSort(field: typeof filters.sortBy) {
    const nextOrder =
      filters.sortBy === field && filters.sortOrder === "asc" ? "desc" : "asc";
    setFilters({ sortBy: field, sortOrder: nextOrder });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="العملاء" description="إدارة بيانات العملاء وسجل طلباتهم" />

      <CustomersToolbar
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleReset}
        hasActiveFilters={hasActiveFilters}
        searchResetKey={searchResetKey}
      />

      <div className="rounded-xl border">
        {isError ? (
          <div className="p-2">
            <ErrorState description="تعذر تحميل قائمة العملاء" onRetry={() => void refetch()} />
          </div>
        ) : !isLoading && data?.customers.length === 0 ? (
          <div className="p-2">
            <EmptyState
              icon={Users}
              title={hasActiveFilters ? "لا توجد نتائج مطابقة" : "لا يوجد عملاء بعد"}
              description={hasActiveFilters ? "جرّب تعديل الفلاتر أو البحث" : "ابدأ بإضافة أول عميل"}
            />
          </div>
        ) : (
          <>
            <CustomersTable
              customers={data?.customers ?? []}
              isLoading={isLoading}
              sortBy={filters.sortBy ?? "createdAt"}
              sortOrder={filters.sortOrder ?? "desc"}
              onSort={handleSort}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
              onRestore={setRestoreTarget}
            />
            {data && (
              <DataPagination
                meta={data.meta}
                onPageChange={(page) => setFilters({ page })}
                onLimitChange={(limit) => setFilters({ limit })}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
              />
            )}
          </>
        )}
      </div>

      <EditCustomerDialog
        customer={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />
      <DeleteCustomerDialog
        customer={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
      <RestoreCustomerDialog
        customer={restoreTarget}
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
      />
    </div>
  );
}
