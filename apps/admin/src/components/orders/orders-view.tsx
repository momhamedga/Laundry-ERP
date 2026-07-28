"use client";

import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DataPagination } from "@/components/tables/data-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getErrorMessage } from "@/lib/axios";
import { useOrdersQuery } from "@/hooks/use-orders";
import { useOrdersFilters } from "@/hooks/use-orders-filters";
import type { OrderListRow } from "@/types/orders";
import { CreateOrderWizard } from "./create-order-wizard";
import { OrderDetailsDrawer } from "./order-details-drawer";
import { OrdersTable } from "./orders-table";
import { OrdersToolbar } from "./orders-toolbar";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/** جسم صفحة قائمة الطلبات - يستخدم useSearchParams لذا يُستدعى داخل Suspense من page.tsx */
export function OrdersView() {
  const { filters, setFilters, resetFilters } = useOrdersFilters();
  const { data, isLoading, isError, error, refetch } = useOrdersQuery(filters);

  const [searchResetKey, setSearchResetKey] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<OrderListRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const hasActiveFilters = !!(
    filters.search ||
    filters.status ||
    filters.paymentStatus ||
    filters.customerId ||
    filters.branchId ||
    filters.receivedFrom ||
    filters.receivedTo
  );

  function handleReset() {
    resetFilters();
    setSearchResetKey((k) => k + 1);
  }

  function handleSort(field: NonNullable<typeof filters.sortBy>) {
    const nextOrder = filters.sortBy === field && filters.sortOrder === "asc" ? "desc" : "asc";
    setFilters({ sortBy: field, sortOrder: nextOrder });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الطلبات" description="متابعة طلبات المغسلة وحالتها" />

      <OrdersToolbar
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleReset}
        hasActiveFilters={hasActiveFilters}
        searchResetKey={searchResetKey}
        onCreateOrder={() => setCreateOpen(true)}
      />

      <div className="rounded-xl border">
        {isError ? (
          <div className="p-2">
            <ErrorState
              description={getErrorMessage(error)}
              onRetry={() => void refetch()}
            />
          </div>
        ) : !isLoading && data?.orders.length === 0 ? (
          <div className="p-2">
            <EmptyState
              icon={ClipboardList}
              title={hasActiveFilters ? "لا توجد نتائج مطابقة" : "لا توجد طلبات بعد"}
              description={hasActiveFilters ? "جرّب تعديل الفلاتر أو البحث" : undefined}
            />
          </div>
        ) : (
          <>
            <OrdersTable
              orders={data?.orders ?? []}
              isLoading={isLoading}
              sortBy={filters.sortBy ?? "receivedAt"}
              sortOrder={filters.sortOrder ?? "desc"}
              onSort={handleSort}
              onViewDetails={setSelectedOrder}
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

      <OrderDetailsDrawer
        orderId={selectedOrder?.id ?? null}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      />
      <CreateOrderWizard open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
