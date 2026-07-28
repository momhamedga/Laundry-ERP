"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/tables/search-box";
import { SortMenu } from "@/components/tables/sort-menu";
import { usePermissions } from "@/hooks/use-permissions";
import type { BranchesFilters } from "@/hooks/use-branches-filters";
import type { BranchSortField } from "@/types/branch";
import { BranchesFiltersSheet } from "./branches-filters-sheet";
import { CreateBranchDialog } from "./create-branch-dialog";

const SORT_OPTIONS: { field: BranchSortField; label: string }[] = [
  { field: "name", label: "الاسم" },
  { field: "createdAt", label: "تاريخ الإنشاء" },
];

interface BranchesToolbarProps {
  filters: BranchesFilters;
  onFiltersChange: (patch: Partial<BranchesFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  searchResetKey: number;
}

export function BranchesToolbar({
  filters,
  onFiltersChange,
  onReset,
  hasActiveFilters,
  searchResetKey,
}: BranchesToolbarProps) {
  const { can } = usePermissions();
  const activeFilterCount = filters.isActive !== undefined ? 1 : 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          key={searchResetKey}
          defaultValue={filters.search ?? ""}
          onSearch={(value) => onFiltersChange({ search: value || undefined })}
          placeholder="ابحث بالاسم..."
        />
        <BranchesFiltersSheet
          filters={filters}
          onApply={onFiltersChange}
          activeCount={activeFilterCount}
        />
        <SortMenu
          options={SORT_OPTIONS}
          sortBy={filters.sortBy ?? "name"}
          sortOrder={filters.sortOrder ?? "asc"}
          onChange={(sortBy, sortOrder) => onFiltersChange({ sortBy, sortOrder })}
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X aria-hidden /> مسح الكل
          </Button>
        )}
      </div>
      {can("branches:manage") && <CreateBranchDialog />}
    </div>
  );
}
