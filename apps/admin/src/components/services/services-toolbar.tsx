"use client";

import { LayoutGrid, X } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { SearchBox } from "@/components/tables/search-box";
import { SortMenu } from "@/components/tables/sort-menu";
import { usePermissions } from "@/hooks/use-permissions";
import type { ServicesFilters } from "@/hooks/use-services-filters";
import type { CategoryWithCount } from "@/types/service-category";
import type { ServiceSortField } from "@/types/service";
import { CreateServiceDialog } from "./create-service-dialog";
import { ServicesFilterSheet } from "./services-filter-sheet";

const SORT_OPTIONS: { field: ServiceSortField; label: string }[] = [
  { field: "sortOrder", label: "ترتيب العرض" },
  { field: "name", label: "الاسم" },
  { field: "price", label: "السعر" },
  { field: "createdAt", label: "تاريخ الإنشاء" },
];

interface ServicesToolbarProps {
  filters: ServicesFilters;
  onFiltersChange: (patch: Partial<ServicesFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  searchResetKey: number;
  categories: readonly CategoryWithCount[];
}

export function ServicesToolbar({
  filters,
  onFiltersChange,
  onReset,
  hasActiveFilters,
  searchResetKey,
  categories,
}: ServicesToolbarProps) {
  const { can } = usePermissions();
  const canManage = can("services:manage");

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          key={searchResetKey}
          defaultValue={filters.search ?? ""}
          onSearch={(value) => onFiltersChange({ search: value || undefined })}
          placeholder="ابحث باسم الخدمة أو الوصف..."
        />
        <ServicesFilterSheet filters={filters} onApply={onFiltersChange} categories={categories} />
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
      <div className="flex items-center gap-2">
        {canManage && (
          <Link href="/service-categories" className={buttonVariants({ variant: "outline" })}>
            <LayoutGrid aria-hidden /> إدارة التصنيفات
          </Link>
        )}
        {canManage && <CreateServiceDialog categories={categories} />}
      </div>
    </div>
  );
}
