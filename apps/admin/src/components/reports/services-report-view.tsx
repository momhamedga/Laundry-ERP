"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UnitBadge } from "@/components/services/unit-badge";
import { SortMenu } from "@/components/tables/sort-menu";
import { useActiveBranchesQuery } from "@/hooks/use-branches";
import { useServicesReportQuery } from "@/hooks/use-reports";
import { formatCurrency } from "@/lib/format";
import type { SortOrder } from "@/types";
import type { ServicesReportParams, ServiceUsageRow, ServicesReportSortField } from "@/types/report";
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

const SORT_OPTIONS: { field: ServicesReportSortField; label: string }[] = [
  { field: "timesUsed", label: "مرات الاستخدام" },
  { field: "totalRevenue", label: "الإيراد" },
  { field: "totalQuantity", label: "الكمية" },
];

interface Filters {
  from: string;
  to: string;
  branchId: string | undefined;
  page: number;
  limit: number;
  sortBy: ServicesReportSortField;
  sortOrder: SortOrder;
}

const INITIAL_FILTERS: Filters = {
  from: "",
  to: "",
  branchId: undefined,
  page: 1,
  limit: 20,
  sortBy: "timesUsed",
  sortOrder: "desc",
};

/**
 * تقرير الخدمات - from/to/branchId/page/limit/sortBy/sortOrder مطابقة حرفياً
 * لـ servicesReportQuerySchema بالخادم. لا summary بهذا التقرير بالخادم -
 * بطاقة "إجمالي الخدمات" الوحيدة مصدرها meta.total الحقيقي
 */
export function ServicesReportView() {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [draft, setDraft] = useState<Filters>(INITIAL_FILTERS);

  const { data: branches } = useActiveBranchesQuery();

  const exportFilters: ServicesReportParams = {
    from: filters.from || undefined,
    to: filters.to || undefined,
    branchId: filters.branchId,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  const { data, isLoading, isError, error, refetch } = useServicesReportQuery({
    ...exportFilters,
    page: filters.page,
    limit: filters.limit,
  });

  const hasActiveFilters = !!(filters.from || filters.to || filters.branchId);
  const activeFilterCount =
    (filters.from ? 1 : 0) + (filters.to ? 1 : 0) + (filters.branchId ? 1 : 0);

  function handleReset() {
    setFilters(INITIAL_FILTERS);
    setDraft(INITIAL_FILTERS);
  }

  function handleSort(field: ServicesReportSortField) {
    setFilters((f) => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortBy === field && f.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    }));
  }

  const columns: ReportsTableColumn<ServiceUsageRow, ServicesReportSortField>[] = [
    { key: "name", label: "الخدمة", render: (r) => r.name },
    { key: "categoryName", label: "الفئة", render: (r) => r.categoryName },
    { key: "unit", label: "الوحدة", render: (r) => <UnitBadge unit={r.unit} /> },
    {
      key: "isActive",
      label: "الحالة",
      render: (r) => (
        <Badge variant={r.isActive ? "default" : "outline"}>{r.isActive ? "نشطة" : "غير نشطة"}</Badge>
      ),
    },
    {
      key: "timesUsed",
      label: "مرات الاستخدام",
      sortField: "timesUsed",
      align: "end",
      render: (r) => r.timesUsed,
    },
    {
      key: "totalQuantity",
      label: "الكمية",
      sortField: "totalQuantity",
      align: "end",
      render: (r) => r.totalQuantity,
    },
    {
      key: "totalRevenue",
      label: "الإيراد",
      sortField: "totalRevenue",
      align: "end",
      render: (r) => formatCurrency(r.totalRevenue),
    },
  ];

  if (isLoading && !data) return <ReportsSkeleton summaryCards={1} />;

  return (
    <div className="space-y-6">
      {data && (
        <ReportsSummaryCards
          items={[
            { key: "total", title: "إجمالي الخدمات", value: String(data.meta.total), icon: Sparkles },
          ]}
        />
      )}

      <ReportsToolbar hasActiveFilters={hasActiveFilters} onReset={handleReset}>
        <ReportsFiltersSheet
          title="فلاتر تقرير الخدمات"
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

          <div className="space-y-1.5">
            <Label>الفرع</Label>
            <Select
              value={draft.branchId ?? "all"}
              onValueChange={(v) => setDraft((d) => ({ ...d, branchId: !v || v === "all" ? undefined : v }))}
              items={{ all: "الكل", ...Object.fromEntries((branches ?? []).map((b) => [b.id, b.name])) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {(branches ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </ReportsFiltersSheet>

        <SortMenu
          options={SORT_OPTIONS}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onChange={(sortBy, sortOrder) => setFilters((f) => ({ ...f, sortBy, sortOrder, page: 1 }))}
        />

        <ExportDropdown type="services" filters={exportFilters} disabled={isLoading} />
      </ReportsToolbar>

      <div className="rounded-xl border">
        {isError ? (
          <ReportsErrorState error={error} onRetry={() => void refetch()} />
        ) : !isLoading && data?.services.length === 0 ? (
          <EmptyReportState icon={Sparkles} title="لا توجد بيانات استخدام خدمات بعد" hasActiveFilters={hasActiveFilters} />
        ) : (
          <>
            <ReportsTable
              columns={columns}
              rows={data?.services ?? []}
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
