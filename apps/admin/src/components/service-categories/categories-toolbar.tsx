"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/tables/search-box";
import { SortMenu } from "@/components/tables/sort-menu";
import { usePermissions } from "@/hooks/use-permissions";
import type { CategoriesFilters } from "@/hooks/use-service-categories-filters";
import type { CategorySortField } from "@/types/service-category";
import { CreateCategoryDialog } from "./create-category-dialog";

const SORT_OPTIONS: { field: CategorySortField; label: string }[] = [
  { field: "sortOrder", label: "ترتيب العرض" },
  { field: "name", label: "الاسم" },
  { field: "createdAt", label: "تاريخ الإنشاء" },
];

interface CategoriesToolbarProps {
  filters: CategoriesFilters;
  onFiltersChange: (patch: Partial<CategoriesFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  searchResetKey: number;
}

export function CategoriesToolbar({
  filters,
  onFiltersChange,
  onReset,
  hasActiveFilters,
  searchResetKey,
}: CategoriesToolbarProps) {
  const { can } = usePermissions();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          key={searchResetKey}
          defaultValue={filters.search ?? ""}
          onSearch={(value) => onFiltersChange({ search: value || undefined })}
          placeholder="ابحث باسم التصنيف..."
        />
        <SortMenu
          options={SORT_OPTIONS}
          sortBy={filters.sortBy ?? "sortOrder"}
          sortOrder={filters.sortOrder ?? "asc"}
          onChange={(sortBy, sortOrder) => onFiltersChange({ sortBy, sortOrder })}
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X aria-hidden /> مسح الكل
          </Button>
        )}
      </div>
      {can("services:manage") && <CreateCategoryDialog />}
    </div>
  );
}
