"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/tables/search-box";
import { SortMenu } from "@/components/tables/sort-menu";
import { usePermissions } from "@/hooks/use-permissions";
import type { OrdersFilters } from "@/hooks/use-orders-filters";
import type { OrderSortField } from "@/types/orders";
import { OrdersFiltersSheet } from "./orders-filters-sheet";

const SORT_OPTIONS: { field: OrderSortField; label: string }[] = [
  { field: "receivedAt", label: "تاريخ الاستلام" },
  { field: "dueDate", label: "تاريخ التسليم" },
  { field: "total", label: "الإجمالي" },
  { field: "orderNumber", label: "رقم الطلب" },
  { field: "createdAt", label: "تاريخ الإنشاء" },
];

interface OrdersToolbarProps {
  filters: OrdersFilters;
  onFiltersChange: (patch: Partial<OrdersFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  searchResetKey: number;
  onCreateOrder: () => void;
}

export function OrdersToolbar({
  filters,
  onFiltersChange,
  onReset,
  hasActiveFilters,
  searchResetKey,
  onCreateOrder,
}: OrdersToolbarProps) {
  const { can } = usePermissions();
  const activeFilterCount =
    (filters.status ? 1 : 0) +
    (filters.paymentStatus ? 1 : 0) +
    (filters.branchId ? 1 : 0) +
    (filters.customerId ? 1 : 0) +
    (filters.receivedFrom ? 1 : 0) +
    (filters.receivedTo ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          key={searchResetKey}
          defaultValue={filters.search ?? ""}
          onSearch={(value) => onFiltersChange({ search: value || undefined })}
          placeholder="ابحث برقم الطلب أو اسم/هاتف العميل..."
        />
        <OrdersFiltersSheet
          filters={filters}
          onApply={onFiltersChange}
          activeCount={activeFilterCount}
        />
        <SortMenu
          options={SORT_OPTIONS}
          sortBy={filters.sortBy ?? "receivedAt"}
          sortOrder={filters.sortOrder ?? "desc"}
          onChange={(sortBy, sortOrder) => onFiltersChange({ sortBy, sortOrder })}
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X aria-hidden /> مسح الكل
          </Button>
        )}
      </div>
      {can("orders:create") && (
        <Button onClick={onCreateOrder}>
          <Plus aria-hidden /> طلب جديد
        </Button>
      )}
    </div>
  );
}
