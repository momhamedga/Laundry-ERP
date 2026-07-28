"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DataPagination } from "@/components/tables/data-pagination";
import { useInvoicesFilters } from "@/hooks/use-invoices-filters";
import { useInvoicesQuery } from "@/hooks/use-invoices";
import type { InvoiceListRow, InvoiceSortField } from "@/types/invoice";
import { InvoiceDetailsDrawer } from "./invoice-details-drawer";
import { InvoiceEmptyState } from "./invoice-empty-state";
import { InvoiceErrorState } from "./invoice-error-state";
import { InvoiceSkeleton } from "./invoice-skeleton";
import { InvoiceSummaryCards } from "./invoice-summary-cards";
import { InvoiceToolbar } from "./invoice-toolbar";
import { InvoicesTable } from "./invoices-table";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/** جسم صفحة قائمة الفواتير - يستخدم useSearchParams لذا يُستدعى داخل Suspense من page.tsx */
export function InvoiceView() {
  const { filters, setFilters, resetFilters } = useInvoicesFilters();
  const { data, isLoading, isError, error, refetch } = useInvoicesQuery(filters);

  const [searchResetKey, setSearchResetKey] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceListRow | null>(null);

  const hasActiveFilters = !!(
    filters.search ||
    filters.status ||
    filters.customerId ||
    filters.branchId ||
    filters.orderId ||
    filters.issuedFrom ||
    filters.issuedTo
  );

  function handleReset() {
    resetFilters();
    setSearchResetKey((k) => k + 1);
  }

  function handleSort(field: InvoiceSortField) {
    const nextOrder = filters.sortBy === field && filters.sortOrder === "asc" ? "desc" : "asc";
    setFilters({ sortBy: field, sortOrder: nextOrder });
  }

  if (isLoading && !data) return <InvoiceSkeleton variant="list" />;

  return (
    <div className="space-y-6">
      <PageHeader title="الفواتير" description="إدارة فواتير الطلبات وإصدارها" />

      <InvoiceSummaryCards />

      <InvoiceToolbar
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleReset}
        hasActiveFilters={hasActiveFilters}
        searchResetKey={searchResetKey}
      />

      <div className="rounded-xl border">
        {isError ? (
          <div className="p-2">
            <InvoiceErrorState error={error} onRetry={() => void refetch()} />
          </div>
        ) : !isLoading && data?.invoices.length === 0 ? (
          <InvoiceEmptyState hasActiveFilters={hasActiveFilters} />
        ) : (
          <>
            <InvoicesTable
              invoices={data?.invoices ?? []}
              isLoading={isLoading}
              sortBy={filters.sortBy ?? "issuedAt"}
              sortOrder={filters.sortOrder ?? "desc"}
              onSort={handleSort}
              onViewDetails={setSelectedInvoice}
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

      <InvoiceDetailsDrawer
        invoiceId={selectedInvoice?.id ?? null}
        open={!!selectedInvoice}
        onOpenChange={(open) => !open && setSelectedInvoice(null)}
      />
    </div>
  );
}
