"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/tables/search-box";
import { SortMenu } from "@/components/tables/sort-menu";
import { usePermissions } from "@/hooks/use-permissions";
import type { PaymentsFilters } from "@/hooks/use-payments-filters";
import type { PaymentSortField } from "@/types/payment";
import { CreatePaymentDialog } from "./create-payment-dialog";
import { PaymentsFiltersSheet } from "./payments-filters-sheet";

const SORT_OPTIONS: { field: PaymentSortField; label: string }[] = [
  { field: "createdAt", label: "تاريخ الإنشاء" },
  { field: "amount", label: "المبلغ" },
];

interface PaymentsToolbarProps {
  filters: PaymentsFilters;
  onFiltersChange: (patch: Partial<PaymentsFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  searchResetKey: number;
}

export function PaymentsToolbar({
  filters,
  onFiltersChange,
  onReset,
  hasActiveFilters,
  searchResetKey,
}: PaymentsToolbarProps) {
  const { can } = usePermissions();
  const activeFilterCount =
    (filters.orderId ? 1 : 0) +
    (filters.method ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.minAmount !== undefined ? 1 : 0) +
    (filters.maxAmount !== undefined ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          key={searchResetKey}
          defaultValue={filters.search ?? ""}
          onSearch={(value) => onFiltersChange({ search: value || undefined })}
          placeholder="ابحث بالمرجع أو رقم الطلب أو اسم العميل..."
        />
        <PaymentsFiltersSheet
          filters={filters}
          onApply={onFiltersChange}
          activeCount={activeFilterCount}
        />
        <SortMenu
          options={SORT_OPTIONS}
          sortBy={filters.sortBy ?? "createdAt"}
          sortOrder={filters.sortOrder ?? "desc"}
          onChange={(sortBy, sortOrder) => onFiltersChange({ sortBy, sortOrder })}
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X aria-hidden /> مسح الكل
          </Button>
        )}
      </div>
      {can("payments:create") && <CreatePaymentDialog />}
    </div>
  );
}
