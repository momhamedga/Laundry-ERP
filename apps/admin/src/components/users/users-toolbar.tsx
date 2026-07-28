"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/tables/search-box";
import { SortMenu } from "@/components/tables/sort-menu";
import { usePermissions } from "@/hooks/use-permissions";
import type { UsersFilters } from "@/hooks/use-users-filters";
import type { UserSortField } from "@/types/user";
import { CreateUserDialog } from "./create-user-dialog";
import { UsersFiltersSheet } from "./users-filters-sheet";

const SORT_OPTIONS: { field: UserSortField; label: string }[] = [
  { field: "createdAt", label: "تاريخ الإنشاء" },
  { field: "name", label: "الاسم" },
  { field: "email", label: "البريد الإلكتروني" },
  { field: "role", label: "الدور" },
];

interface UsersToolbarProps {
  filters: UsersFilters;
  onFiltersChange: (patch: Partial<UsersFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  searchResetKey: number;
}

export function UsersToolbar({
  filters,
  onFiltersChange,
  onReset,
  hasActiveFilters,
  searchResetKey,
}: UsersToolbarProps) {
  const { can } = usePermissions();
  const activeFilterCount = (filters.role ? 1 : 0) + (filters.isActive !== undefined ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          key={searchResetKey}
          defaultValue={filters.search ?? ""}
          onSearch={(value) => onFiltersChange({ search: value || undefined })}
          placeholder="ابحث بالاسم أو البريد أو الهاتف..."
        />
        <UsersFiltersSheet
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
      {can("users:manage") && <CreateUserDialog />}
    </div>
  );
}
