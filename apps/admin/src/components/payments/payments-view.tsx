"use client";

import { CreditCard } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DataPagination } from "@/components/tables/data-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getErrorMessage } from "@/lib/axios";
import { usePaymentsQuery } from "@/hooks/use-payments";
import { usePaymentsFilters } from "@/hooks/use-payments-filters";
import type { Payment } from "@/types/payment";
import { PaymentDetailsDrawer } from "./payment-details-drawer";
import { PaymentsSummaryCards } from "./payments-summary-cards";
import { PaymentsTable } from "./payments-table";
import { PaymentsToolbar } from "./payments-toolbar";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/** جسم صفحة قائمة المدفوعات - يستخدم useSearchParams لذا يُستدعى داخل Suspense من page.tsx */
export function PaymentsView() {
  const { filters, setFilters, resetFilters } = usePaymentsFilters();
  const { data, isLoading, isError, error, refetch } = usePaymentsQuery(filters);

  const [searchResetKey, setSearchResetKey] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const hasActiveFilters = !!(
    filters.search ||
    filters.orderId ||
    filters.method ||
    filters.status ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.minAmount !== undefined ||
    filters.maxAmount !== undefined
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
      <PageHeader title="المدفوعات" description="سجل جميع دفعات الطلبات" />

      <PaymentsSummaryCards />

      <PaymentsToolbar
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleReset}
        hasActiveFilters={hasActiveFilters}
        searchResetKey={searchResetKey}
      />

      <div className="rounded-xl border">
        {isError ? (
          <div className="p-2">
            <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
          </div>
        ) : !isLoading && data?.payments.length === 0 ? (
          <div className="p-2">
            <EmptyState
              icon={CreditCard}
              title={hasActiveFilters ? "لا توجد نتائج مطابقة" : "لا توجد مدفوعات بعد"}
              description={hasActiveFilters ? "جرّب تعديل الفلاتر أو البحث" : undefined}
            />
          </div>
        ) : (
          <>
            <PaymentsTable
              payments={data?.payments ?? []}
              isLoading={isLoading}
              sortBy={filters.sortBy ?? "createdAt"}
              sortOrder={filters.sortOrder ?? "desc"}
              onSort={handleSort}
              onViewDetails={setSelectedPayment}
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

      <PaymentDetailsDrawer
        paymentId={selectedPayment?.id ?? null}
        open={!!selectedPayment}
        onOpenChange={(open) => !open && setSelectedPayment(null)}
      />
    </div>
  );
}
