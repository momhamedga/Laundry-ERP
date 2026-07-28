"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import type { CustomersFilters } from "@/hooks/use-customers-filters";
import { CreateCustomerDialog } from "./create-customer-dialog";
import { FilterSheet } from "./filter-sheet";
import { SearchBox } from "./search-box";
import { SortMenu } from "./sort-menu";

interface CustomersToolbarProps {
  filters: CustomersFilters;
  onFiltersChange: (patch: Partial<CustomersFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  searchResetKey: number;
}

export function CustomersToolbar({
  filters,
  onFiltersChange,
  onReset,
  hasActiveFilters,
  searchResetKey,
}: CustomersToolbarProps) {
  const { can } = usePermissions();
  const activeFilterCount =
    (filters.isActive !== undefined ? 1 : 0) +
    (filters.createdFrom ? 1 : 0) +
    (filters.createdTo ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          key={searchResetKey}
          defaultValue={filters.search ?? ""}
          onSearch={(value) => onFiltersChange({ search: value || undefined })}
          placeholder="ابحث بالاسم أو الهاتف أو البريد..."
        />
        <FilterSheet filters={filters} onApply={onFiltersChange} activeCount={activeFilterCount} />
        <SortMenu
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
      {can("customers:manage") && <CreateCustomerDialog />}
    </div>
  );
}
