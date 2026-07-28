"use client";

import { Clock, CreditCard, DollarSign, RotateCcw } from "lucide-react";
import { useState } from "react";
import { PaymentMethodBadge } from "@/components/payments/payment-method-badge";
import { PaymentTxStatusBadge } from "@/components/payments/payment-tx-status-badge";
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
import { usePaymentsReportQuery } from "@/hooks/use-reports";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { SortOrder } from "@/types";
import type { PaymentMethod, PaymentTxStatus } from "@/types/payment";
import type { PaymentsReportParams, PaymentsReportRow, PaymentsReportSortField } from "@/types/report";
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

const SORT_OPTIONS: { field: PaymentsReportSortField; label: string }[] = [
  { field: "createdAt", label: "تاريخ الإنشاء" },
  { field: "amount", label: "المبلغ" },
];

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "نقدي",
  CARD: "بطاقة",
  BANK_TRANSFER: "تحويل بنكي",
  MOBILE_WALLET: "محفظة إلكترونية",
};

const STATUS_LABELS: Record<PaymentTxStatus, string> = {
  PENDING: "قيد الانتظار",
  COMPLETED: "مكتملة",
  FAILED: "فشلت",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
};

type MethodValue = PaymentMethod | "all";
type StatusValue = PaymentTxStatus | "all";

interface Filters {
  from: string;
  to: string;
  branchId: string | undefined;
  method: MethodValue;
  status: StatusValue;
  page: number;
  limit: number;
  sortBy: PaymentsReportSortField;
  sortOrder: SortOrder;
}

const INITIAL_FILTERS: Filters = {
  from: "",
  to: "",
  branchId: undefined,
  method: "all",
  status: "all",
  page: 1,
  limit: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
};

/** تقرير المدفوعات - from/to/branchId/method/status/page/limit/sortBy/sortOrder مطابقة حرفياً لـ paymentsReportQuerySchema بالخادم */
export function PaymentsReportView() {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [draft, setDraft] = useState<Filters>(INITIAL_FILTERS);

  const { data: branches } = useActiveBranchesQuery();

  const exportFilters: PaymentsReportParams = {
    from: filters.from || undefined,
    to: filters.to || undefined,
    branchId: filters.branchId,
    method: filters.method === "all" ? undefined : filters.method,
    status: filters.status === "all" ? undefined : filters.status,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  const { data, isLoading, isError, error, refetch } = usePaymentsReportQuery({
    ...exportFilters,
    page: filters.page,
    limit: filters.limit,
  });

  const hasActiveFilters = !!(
    filters.from ||
    filters.to ||
    filters.branchId ||
    filters.method !== "all" ||
    filters.status !== "all"
  );
  const activeFilterCount =
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0) +
    (filters.branchId ? 1 : 0) +
    (filters.method !== "all" ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0);

  function handleReset() {
    setFilters(INITIAL_FILTERS);
    setDraft(INITIAL_FILTERS);
  }

  function handleSort(field: PaymentsReportSortField) {
    setFilters((f) => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortBy === field && f.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    }));
  }

  const columns: ReportsTableColumn<PaymentsReportRow, PaymentsReportSortField>[] = [
    { key: "orderNumber", label: "رقم الطلب", render: (r) => r.orderNumber },
    { key: "branch", label: "الفرع", render: (r) => r.branchName },
    { key: "method", label: "الطريقة", render: (r) => <PaymentMethodBadge method={r.method} /> },
    { key: "status", label: "الحالة", render: (r) => <PaymentTxStatusBadge status={r.status} /> },
    {
      key: "amount",
      label: "المبلغ",
      sortField: "amount",
      align: "end",
      render: (r) => formatCurrency(r.amount),
    },
    {
      key: "refundedAmount",
      label: "المسترد",
      align: "end",
      render: (r) => formatCurrency(r.refundedAmount),
    },
    {
      key: "createdAt",
      label: "التاريخ",
      sortField: "createdAt",
      render: (r) => formatDateTime(r.createdAt),
    },
  ];

  if (isLoading && !data) return <ReportsSkeleton summaryCards={4} />;

  return (
    <div className="space-y-6">
      {data && (
        <ReportsSummaryCards
          items={[
            {
              key: "totalPayments",
              title: "إجمالي المدفوعات",
              value: String(data.summary.totalPayments),
              icon: CreditCard,
            },
            {
              key: "totalAmount",
              title: "صافي المحصَّل",
              value: formatCurrency(data.summary.totalAmount),
              icon: DollarSign,
              tone: "success",
            },
            {
              key: "pending",
              title: "معلَّق",
              value: formatCurrency(data.summary.pending),
              icon: Clock,
              tone: "warning",
            },
            {
              key: "refunded",
              title: "مسترد",
              value: formatCurrency(data.summary.refunded),
              icon: RotateCcw,
              tone: "destructive",
            },
          ]}
        />
      )}

      <ReportsToolbar hasActiveFilters={hasActiveFilters} onReset={handleReset}>
        <ReportsFiltersSheet
          title="فلاتر تقرير المدفوعات"
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
            <Label>طريقة الدفع</Label>
            <Select
              value={draft.method}
              onValueChange={(v) => setDraft((d) => ({ ...d, method: (v as MethodValue) ?? "all" }))}
              items={{ all: "الكل", ...METHOD_LABELS }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>الحالة</Label>
            <Select
              value={draft.status}
              onValueChange={(v) => setDraft((d) => ({ ...d, status: (v as StatusValue) ?? "all" }))}
              items={{ all: "الكل", ...STATUS_LABELS }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {(Object.keys(STATUS_LABELS) as PaymentTxStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
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

        <ExportDropdown type="payments" filters={exportFilters} disabled={isLoading} />
      </ReportsToolbar>

      <div className="rounded-xl border">
        {isError ? (
          <ReportsErrorState error={error} onRetry={() => void refetch()} />
        ) : !isLoading && data?.payments.length === 0 ? (
          <EmptyReportState icon={CreditCard} title="لا توجد مدفوعات بعد" hasActiveFilters={hasActiveFilters} />
        ) : (
          <>
            <ReportsTable
              columns={columns}
              rows={data?.payments ?? []}
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
