"use client";

import { Building2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SortMenu } from "@/components/tables/sort-menu";
import { useBranchesReportQuery } from "@/hooks/use-reports";
import { formatCurrency } from "@/lib/format";
import type { SortOrder } from "@/types";
import type { BranchesReportParams, BranchReportRow, BranchesReportSortField } from "@/types/report";
import { EmptyReportState } from "./empty-report-state";
import { ExportDropdown } from "./export-dropdown";
import { ReportDateRangePicker } from "./report-date-range-picker";
import { ReportsErrorState } from "./reports-error-state";
import { ReportsFiltersSheet } from "./reports-filters-sheet";
import { ReportsPagination } from "./reports-pagination";
import { ReportsSkeleton } from "./reports-skeleton";
import { ReportsSummaryCards } from "./reports-summary-cards";
import { ReportsTable, type ReportsTableColumn } from "./reports-table";
import { ReportsToolbar } from "./reports-toolbar";

const SORT_OPTIONS: { field: BranchesReportSortField; label: string }[] = [
  { field: "revenue", label: "الإيراد" },
  { field: "ordersCount", label: "عدد الطلبات" },
  { field: "customersCount", label: "عدد العملاء" },
];

interface Filters {
  from: string;
  to: string;
  page: number;
  limit: number;
  sortBy: BranchesReportSortField;
  sortOrder: SortOrder;
}

const INITIAL_FILTERS: Filters = {
  from: "",
  to: "",
  page: 1,
  limit: 20,
  sortBy: "revenue",
  sortOrder: "desc",
};

/**
 * تقرير الفروع - from/to/page/limit/sortBy/sortOrder مطابقة حرفياً لـ
 * branchesReportQuerySchema بالخادم. لا فلتر branchId عمداً (مقارنة بين
 * الفروع نفسها) ولا summary - بطاقة "إجمالي الفروع" الوحيدة من meta.total
 */
export function BranchesReportView() {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [draft, setDraft] = useState<Filters>(INITIAL_FILTERS);

  const exportFilters: BranchesReportParams = {
    from: filters.from || undefined,
    to: filters.to || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  const { data, isLoading, isError, error, refetch } = useBranchesReportQuery({
    ...exportFilters,
    page: filters.page,
    limit: filters.limit,
  });

  const hasActiveFilters = !!(filters.from || filters.to);
  const activeFilterCount = (filters.from ? 1 : 0) + (filters.to ? 1 : 0);

  function handleReset() {
    setFilters(INITIAL_FILTERS);
    setDraft(INITIAL_FILTERS);
  }

  function handleSort(field: BranchesReportSortField) {
    setFilters((f) => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortBy === field && f.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    }));
  }

  const columns: ReportsTableColumn<BranchReportRow, BranchesReportSortField>[] = [
    { key: "name", label: "الفرع", render: (r) => r.name },
    {
      key: "isActive",
      label: "الحالة",
      render: (r) => (
        <Badge variant={r.isActive ? "default" : "outline"}>{r.isActive ? "نشط" : "غير نشط"}</Badge>
      ),
    },
    {
      key: "revenue",
      label: "الإيراد",
      sortField: "revenue",
      align: "end",
      render: (r) => formatCurrency(r.revenue),
    },
    {
      key: "ordersCount",
      label: "عدد الطلبات",
      sortField: "ordersCount",
      align: "end",
      render: (r) => r.ordersCount,
    },
    {
      key: "customersCount",
      label: "عدد العملاء",
      sortField: "customersCount",
      align: "end",
      render: (r) => r.customersCount,
    },
    { key: "paymentsCount", label: "عدد المدفوعات", align: "end", render: (r) => r.paymentsCount },
  ];

  if (isLoading && !data) return <ReportsSkeleton summaryCards={1} />;

  return (
    <div className="space-y-6">
      {data && (
        <ReportsSummaryCards
          items={[
            { key: "total", title: "إجمالي الفروع", value: String(data.meta.total), icon: Building2 },
          ]}
        />
      )}

      <ReportsToolbar hasActiveFilters={hasActiveFilters} onReset={handleReset}>
        <ReportsFiltersSheet
          title="فلاتر تقرير الفروع"
          activeCount={activeFilterCount}
          onOpen={() => setDraft(filters)}
          onApply={() => setFilters({ ...draft, page: 1 })}
          onReset={handleReset}
        >
          <ReportDateRangePicker
            from={draft.from}
            to={draft.to}
            onFromChange={(v) => setDraft((d) => ({ ...d, from: v }))}
            onToChange={(v) => setDraft((d) => ({ ...d, to: v }))}
          />
        </ReportsFiltersSheet>

        <SortMenu
          options={SORT_OPTIONS}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onChange={(sortBy, sortOrder) => setFilters((f) => ({ ...f, sortBy, sortOrder, page: 1 }))}
        />

        <ExportDropdown type="branches" filters={exportFilters} disabled={isLoading} />
      </ReportsToolbar>

      <div className="rounded-xl border">
        {isError ? (
          <ReportsErrorState error={error} onRetry={() => void refetch()} />
        ) : !isLoading && data?.branches.length === 0 ? (
          <EmptyReportState icon={Building2} title="لا توجد فروع بعد" hasActiveFilters={hasActiveFilters} />
        ) : (
          <>
            <ReportsTable
              columns={columns}
              rows={data?.branches ?? []}
              rowKey={(r) => r.id}
              isLoading={isLoading}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSort={handleSort}
            />
            {data && (
              <ReportsPagination
                meta={data.meta}
                onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
                onLimitChange={(limit) => setFilters((f) => ({ ...f, limit, page: 1 }))}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
