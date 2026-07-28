"use client";

import { UserCog } from "lucide-react";
import { useState } from "react";
import { RoleBadge } from "@/components/users/role-badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortMenu } from "@/components/tables/sort-menu";
import { useActiveBranchesQuery } from "@/hooks/use-branches";
import { useEmployeesReportQuery } from "@/hooks/use-reports";
import { formatCurrency } from "@/lib/format";
import type { SortOrder } from "@/types";
import type { EmployeeReportRow, EmployeesReportParams, EmployeesReportSortField } from "@/types/report";
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

const SORT_OPTIONS: { field: EmployeesReportSortField; label: string }[] = [
  { field: "ordersCreatedCount", label: "طلبات مُنشأة" },
  { field: "paymentsProcessedAmount", label: "مبلغ مدفوعات مُعالَجة" },
];

interface Filters {
  from: string;
  to: string;
  branchId: string | undefined;
  page: number;
  limit: number;
  sortBy: EmployeesReportSortField;
  sortOrder: SortOrder;
}

const INITIAL_FILTERS: Filters = {
  from: "",
  to: "",
  branchId: undefined,
  page: 1,
  limit: 20,
  sortBy: "ordersCreatedCount",
  sortOrder: "desc",
};

/**
 * تقرير الموظفين - from/to/branchId/page/limit/sortBy/sortOrder مطابقة حرفياً
 * لـ employeesReportQuerySchema بالخادم. لا summary بهذا التقرير - بطاقة
 * "إجمالي الموظفين النشطين ضمن الفترة" الوحيدة من meta.total الحقيقي
 * (فقط من لديهم طلب مُنشأ أو دفعة مُعالَجة ضمن الفلاتر - راجع employeesUsage بالخادم)
 */
export function EmployeesReportView() {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [draft, setDraft] = useState<Filters>(INITIAL_FILTERS);

  const { data: branches } = useActiveBranchesQuery();

  const exportFilters: EmployeesReportParams = {
    from: filters.from || undefined,
    to: filters.to || undefined,
    branchId: filters.branchId,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  const { data, isLoading, isError, error, refetch } = useEmployeesReportQuery({
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

  function handleSort(field: EmployeesReportSortField) {
    setFilters((f) => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortBy === field && f.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    }));
  }

  const columns: ReportsTableColumn<EmployeeReportRow, EmployeesReportSortField>[] = [
    { key: "name", label: "الاسم", render: (r) => r.name },
    { key: "email", label: "الإيميل", render: (r) => <span dir="ltr">{r.email}</span> },
    { key: "role", label: "الدور", render: (r) => <RoleBadge role={r.role} /> },
    {
      key: "ordersCreatedCount",
      label: "طلبات مُنشأة",
      sortField: "ordersCreatedCount",
      align: "end",
      render: (r) => r.ordersCreatedCount,
    },
    {
      key: "paymentsProcessedCount",
      label: "مدفوعات مُعالَجة",
      align: "end",
      render: (r) => r.paymentsProcessedCount,
    },
    {
      key: "paymentsProcessedAmount",
      label: "مبلغ المدفوعات",
      sortField: "paymentsProcessedAmount",
      align: "end",
      render: (r) => formatCurrency(r.paymentsProcessedAmount),
    },
  ];

  if (isLoading && !data) return <ReportsSkeleton summaryCards={1} />;

  return (
    <div className="space-y-6">
      {data && (
        <ReportsSummaryCards
          items={[
            { key: "total", title: "إجمالي الموظفين النشطين", value: String(data.meta.total), icon: UserCog },
          ]}
        />
      )}

      <ReportsToolbar hasActiveFilters={hasActiveFilters} onReset={handleReset}>
        <ReportsFiltersSheet
          title="فلاتر تقرير الموظفين"
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

        <ExportDropdown type="employees" filters={exportFilters} disabled={isLoading} />
      </ReportsToolbar>

      <div className="rounded-xl border">
        {isError ? (
          <ReportsErrorState error={error} onRetry={() => void refetch()} />
        ) : !isLoading && data?.employees.length === 0 ? (
          <EmptyReportState icon={UserCog} title="لا يوجد نشاط موظفين ضمن هذه الفترة" hasActiveFilters={hasActiveFilters} />
        ) : (
          <>
            <ReportsTable
              columns={columns}
              rows={data?.employees ?? []}
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
