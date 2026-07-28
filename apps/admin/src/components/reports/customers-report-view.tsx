"use client";

import { Trophy, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortMenu } from "@/components/tables/sort-menu";
import { useActiveBranchesQuery } from "@/hooks/use-branches";
import { useCustomersReportQuery } from "@/hooks/use-reports";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  REPORT_TOP_CUSTOMERS_DEFAULT,
  REPORT_TOP_CUSTOMERS_MAX,
} from "@/lib/validations/report";
import type { SortOrder } from "@/types";
import type { CustomersReportParams, CustomersReportRow, CustomersReportSortField } from "@/types/report";
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

const SORT_OPTIONS: { field: CustomersReportSortField; label: string }[] = [
  { field: "createdAt", label: "تاريخ الإنشاء" },
  { field: "name", label: "الاسم" },
];

interface Filters {
  from: string;
  to: string;
  branchId: string | undefined;
  topLimit: number;
  page: number;
  limit: number;
  sortBy: CustomersReportSortField;
  sortOrder: SortOrder;
}

const INITIAL_FILTERS: Filters = {
  from: "",
  to: "",
  branchId: undefined,
  topLimit: REPORT_TOP_CUSTOMERS_DEFAULT,
  page: 1,
  limit: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
};

/** تقرير العملاء - from/to/branchId/topLimit/page/limit/sortBy/sortOrder مطابقة حرفياً لـ customersReportQuerySchema بالخادم */
export function CustomersReportView() {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [draft, setDraft] = useState<Filters>(INITIAL_FILTERS);

  const { data: branches } = useActiveBranchesQuery();

  const exportFilters: CustomersReportParams = {
    from: filters.from || undefined,
    to: filters.to || undefined,
    branchId: filters.branchId,
    topLimit: filters.topLimit,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  const { data, isLoading, isError, error, refetch } = useCustomersReportQuery({
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

  function handleSort(field: CustomersReportSortField) {
    setFilters((f) => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortBy === field && f.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    }));
  }

  const columns: ReportsTableColumn<CustomersReportRow, CustomersReportSortField>[] = [
    { key: "name", label: "الاسم", sortField: "name", render: (r) => r.name },
    { key: "phone", label: "الهاتف", render: (r) => <span dir="ltr">{r.phone}</span> },
    { key: "email", label: "الإيميل", render: (r) => r.email ?? "—" },
    { key: "ordersCount", label: "عدد الطلبات", align: "end", render: (r) => r.ordersCount },
    {
      key: "totalSpent",
      label: "إجمالي الإنفاق",
      align: "end",
      render: (r) => formatCurrency(r.totalSpent),
    },
    {
      key: "createdAt",
      label: "تاريخ الإنشاء",
      sortField: "createdAt",
      render: (r) => formatDate(r.createdAt),
    },
  ];

  if (isLoading && !data) return <ReportsSkeleton summaryCards={2} />;

  return (
    <div className="space-y-6">
      {data && (
        <ReportsSummaryCards
          items={[
            {
              key: "totalCustomers",
              title: "إجمالي العملاء",
              value: String(data.summary.totalCustomers),
              icon: Users,
            },
            {
              key: "newCustomers",
              title: "عملاء جدد ضمن الفترة",
              value: String(data.summary.newCustomers),
              icon: UserPlus,
              tone: "success",
            },
          ]}
        />
      )}

      <ReportsToolbar hasActiveFilters={hasActiveFilters} onReset={handleReset}>
        <ReportsFiltersSheet
          title="فلاتر تقرير العملاء"
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

          <div className="space-y-1.5">
            <Label htmlFor="report-top-limit">عدد أعلى العملاء (Top)</Label>
            <Input
              id="report-top-limit"
              type="number"
              min={1}
              max={REPORT_TOP_CUSTOMERS_MAX}
              dir="ltr"
              value={draft.topLimit}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  topLimit: Math.min(
                    REPORT_TOP_CUSTOMERS_MAX,
                    Math.max(1, Number(e.target.value) || REPORT_TOP_CUSTOMERS_DEFAULT),
                  ),
                }))
              }
            />
          </div>
        </ReportsFiltersSheet>

        <SortMenu
          options={SORT_OPTIONS}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onChange={(sortBy, sortOrder) => setFilters((f) => ({ ...f, sortBy, sortOrder, page: 1 }))}
        />

        <ExportDropdown type="customers" filters={exportFilters} disabled={isLoading} />
      </ReportsToolbar>

      {data && data.topCustomers.length > 0 && (
        <div className="rounded-xl border">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Trophy className="size-4 text-warning" aria-hidden />
            <h2 className="font-medium">أعلى {filters.topLimit} عميل إنفاقاً</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">الاسم</TableHead>
                <TableHead className="text-start">الهاتف</TableHead>
                <TableHead className="text-end">عدد الطلبات</TableHead>
                <TableHead className="text-end">إجمالي الإنفاق</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topCustomers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell dir="ltr">{c.phone}</TableCell>
                  <TableCell className="text-end tabular-nums">{c.ordersCount}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatCurrency(c.totalSpent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="rounded-xl border">
        {isError ? (
          <ReportsErrorState error={error} onRetry={() => void refetch()} />
        ) : !isLoading && data?.customers.length === 0 ? (
          <EmptyReportState icon={Users} title="لا يوجد عملاء نشطون ضمن هذه الفترة" hasActiveFilters={hasActiveFilters} />
        ) : (
          <>
            <ReportsTable
              columns={columns}
              rows={data?.customers ?? []}
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
