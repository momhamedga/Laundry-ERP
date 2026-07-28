"use client";

import { DollarSign, Receipt, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { CustomerFilterField } from "@/components/orders/customer-filter-field";
import { OrderStatusBadge } from "@/components/orders/status-badge";
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
import { useOrdersReportQuery } from "@/hooks/use-reports";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { ORDER_STATUS_META } from "@/lib/order-status";
import type { OrdersReportParams, OrdersReportSortField, OrdersReportRow } from "@/types/report";
import type { OrderStatus } from "@/types/orders";
import type { SortOrder } from "@/types";
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

const SORT_OPTIONS: { field: OrdersReportSortField; label: string }[] = [
  { field: "receivedAt", label: "تاريخ الاستلام" },
  { field: "total", label: "الإجمالي" },
  { field: "orderNumber", label: "رقم الطلب" },
];

type StatusValue = OrderStatus | "all";

interface Filters {
  from: string;
  to: string;
  branchId: string | undefined;
  customerId: string | undefined;
  customerName: string | undefined;
  status: StatusValue;
  page: number;
  limit: number;
  sortBy: OrdersReportSortField;
  sortOrder: SortOrder;
}

const INITIAL_FILTERS: Filters = {
  from: "",
  to: "",
  branchId: undefined,
  customerId: undefined,
  customerName: undefined,
  status: "all",
  page: 1,
  limit: 20,
  sortBy: "receivedAt",
  sortOrder: "desc",
};

/** تقرير الطلبات - from/to/branchId/customerId/status/page/limit/sortBy/sortOrder مطابقة حرفياً لـ ordersReportQuerySchema بالخادم */
export function OrdersReportView() {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [draft, setDraft] = useState<Filters>(INITIAL_FILTERS);

  const { data: branches } = useActiveBranchesQuery();

  // فلاتر التصدير = نفس فلاتر الاستعلام بلا page/limit (التصدير يشمل كل الصفوف المطابقة)
  const exportFilters: OrdersReportParams = {
    from: filters.from || undefined,
    to: filters.to || undefined,
    branchId: filters.branchId,
    customerId: filters.customerId,
    status: filters.status === "all" ? undefined : filters.status,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  const { data, isLoading, isError, error, refetch } = useOrdersReportQuery({
    ...exportFilters,
    page: filters.page,
    limit: filters.limit,
  });

  const hasActiveFilters = !!(
    filters.from ||
    filters.to ||
    filters.branchId ||
    filters.customerId ||
    filters.status !== "all"
  );
  const activeFilterCount =
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0) +
    (filters.branchId ? 1 : 0) +
    (filters.customerId ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0);

  function handleReset() {
    setFilters(INITIAL_FILTERS);
    setDraft(INITIAL_FILTERS);
  }

  function handleSort(field: OrdersReportSortField) {
    setFilters((f) => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortBy === field && f.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    }));
  }

  const columns: ReportsTableColumn<OrdersReportRow, OrdersReportSortField>[] = [
    { key: "orderNumber", label: "رقم الطلب", sortField: "orderNumber", render: (r) => r.orderNumber },
    { key: "customer", label: "العميل", render: (r) => r.customerName },
    { key: "branch", label: "الفرع", render: (r) => r.branchName },
    { key: "status", label: "الحالة", render: (r) => <OrderStatusBadge status={r.status} /> },
    {
      key: "total",
      label: "الإجمالي",
      sortField: "total",
      align: "end",
      render: (r) => formatCurrency(r.total),
    },
    {
      key: "receivedAt",
      label: "تاريخ الاستلام",
      sortField: "receivedAt",
      render: (r) => formatDateTime(r.receivedAt),
    },
    { key: "deliveredAt", label: "تاريخ التسليم", render: (r) => formatDateTime(r.deliveredAt) },
  ];

  if (isLoading && !data) return <ReportsSkeleton summaryCards={3} />;

  return (
    <div className="space-y-6">
      {data && (
        <ReportsSummaryCards
          items={[
            {
              key: "totalOrders",
              title: "إجمالي الطلبات",
              value: String(data.summary.totalOrders),
              icon: ShoppingCart,
            },
            {
              key: "totalRevenue",
              title: "إجمالي الإيراد",
              value: formatCurrency(data.summary.totalRevenue),
              icon: DollarSign,
              tone: "success",
            },
            {
              key: "averageOrderValue",
              title: "متوسط قيمة الطلب",
              value: formatCurrency(data.summary.averageOrderValue),
              icon: Receipt,
            },
          ]}
        />
      )}

      <ReportsToolbar hasActiveFilters={hasActiveFilters} onReset={handleReset}>
        <ReportsFiltersSheet
          title="فلاتر تقرير الطلبات"
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
            <Label>العميل</Label>
            <CustomerFilterField
              customerId={draft.customerId}
              customerName={draft.customerName}
              onSelect={(id, name) => setDraft((d) => ({ ...d, customerId: id, customerName: name }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>الحالة</Label>
            <Select
              value={draft.status}
              onValueChange={(v) => setDraft((d) => ({ ...d, status: (v as StatusValue) ?? "all" }))}
              items={{
                all: "الكل",
                ...Object.fromEntries(
                  Object.entries(ORDER_STATUS_META).map(([k, v]) => [k, v.label]),
                ),
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {(Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {ORDER_STATUS_META[s].label}
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

        <ExportDropdown type="orders" filters={exportFilters} disabled={isLoading} />
      </ReportsToolbar>

      <div className="rounded-xl border">
        {isError ? (
          <ReportsErrorState error={error} onRetry={() => void refetch()} />
        ) : !isLoading && data?.orders.length === 0 ? (
          <EmptyReportState icon={ShoppingCart} title="لا توجد طلبات بعد" hasActiveFilters={hasActiveFilters} />
        ) : (
          <>
            <ReportsTable
              columns={columns}
              rows={data?.orders ?? []}
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
