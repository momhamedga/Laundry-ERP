"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/tables/search-box";
import { SortMenu } from "@/components/tables/sort-menu";
import { usePermissions } from "@/hooks/use-permissions";
import type { InvoicesFilters } from "@/hooks/use-invoices-filters";
import type { InvoiceSortField } from "@/types/invoice";
import { CreateInvoiceDialog } from "./create-invoice-dialog";
import { InvoiceFiltersSheet } from "./invoice-filters-sheet";

const SORT_OPTIONS: { field: InvoiceSortField; label: string }[] = [
  { field: "issuedAt", label: "تاريخ الإصدار" },
  { field: "dueDate", label: "تاريخ الاستحقاق" },
  { field: "total", label: "الإجمالي" },
  { field: "invoiceNumber", label: "رقم الفاتورة" },
  { field: "createdAt", label: "تاريخ الإنشاء" },
];

interface InvoiceToolbarProps {
  filters: InvoicesFilters;
  onFiltersChange: (patch: Partial<InvoicesFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  searchResetKey: number;
}

export function InvoiceToolbar({
  filters,
  onFiltersChange,
  onReset,
  hasActiveFilters,
  searchResetKey,
}: InvoiceToolbarProps) {
  const { can } = usePermissions();
  const activeFilterCount =
    (filters.status ? 1 : 0) +
    (filters.customerId ? 1 : 0) +
    (filters.branchId ? 1 : 0) +
    (filters.orderId ? 1 : 0) +
    (filters.issuedFrom ? 1 : 0) +
    (filters.issuedTo ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          key={searchResetKey}
          defaultValue={filters.search ?? ""}
          onSearch={(value) => onFiltersChange({ search: value || undefined })}
          placeholder="ابحث برقم الفاتورة أو اسم العميل أو هاتفه..."
        />
        <InvoiceFiltersSheet filters={filters} onApply={onFiltersChange} activeCount={activeFilterCount} />
        <SortMenu
          options={SORT_OPTIONS}
          sortBy={filters.sortBy ?? "issuedAt"}
          sortOrder={filters.sortOrder ?? "desc"}
          onChange={(sortBy, sortOrder) => onFiltersChange({ sortBy, sortOrder })}
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X aria-hidden /> مسح الكل
          </Button>
        )}
      </div>
      {can("invoices:create") && <CreateInvoiceDialog />}
    </div>
  );
}
