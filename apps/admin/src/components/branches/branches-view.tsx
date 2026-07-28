"use client";

import { Building2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DataPagination } from "@/components/tables/data-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PAGE_SIZE_OPTIONS } from "@/constants/branches";
import { getErrorMessage } from "@/lib/axios";
import { useBranchesQuery } from "@/hooks/use-branches";
import { useBranchesFilters } from "@/hooks/use-branches-filters";
import type { Branch } from "@/types/branch";
import { ActivateBranchDialog } from "./activate-branch-dialog";
import { BranchDetailsDrawer } from "./branch-details-drawer";
import { BranchesSummaryCards } from "./branches-summary-cards";
import { BranchesTable } from "./branches-table";
import { BranchesToolbar } from "./branches-toolbar";
import { DeactivateBranchDialog } from "./deactivate-branch-dialog";
import { DeleteBranchDialog } from "./delete-branch-dialog";
import { EditBranchDialog } from "./edit-branch-dialog";

/** جسم صفحة قائمة الفروع - يستخدم useSearchParams لذا يُستدعى داخل Suspense من page.tsx */
export function BranchesView() {
  const { filters, setFilters, resetFilters } = useBranchesFilters();
  const { data, isLoading, isError, error, refetch } = useBranchesQuery(filters);

  const [searchResetKey, setSearchResetKey] = useState(0);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [activateTarget, setActivateTarget] = useState<Branch | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  const hasActiveFilters = !!(filters.search || filters.isActive !== undefined);

  function handleReset() {
    resetFilters();
    setSearchResetKey((k) => k + 1);
  }

  function handleSort(field: NonNullable<typeof filters.sortBy>) {
    const nextOrder = filters.sortBy === field && filters.sortOrder === "asc" ? "desc" : "asc";
    setFilters({ sortBy: field, sortOrder: nextOrder });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الفروع" description="إدارة فروع المغسلة" />

      <BranchesSummaryCards />

      <BranchesToolbar
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleReset}
        hasActiveFilters={hasActiveFilters}
        searchResetKey={searchResetKey}
      />

      <div className="rounded-xl border">
        {isError ? (
          <div className="p-2">
            <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
          </div>
        ) : !isLoading && data?.branches.length === 0 ? (
          <div className="p-2">
            <EmptyState
              icon={Building2}
              title={hasActiveFilters ? "لا توجد نتائج مطابقة" : "لا توجد فروع بعد"}
              description={hasActiveFilters ? "جرّب تعديل الفلاتر أو البحث" : undefined}
            />
          </div>
        ) : (
          <>
            <BranchesTable
              branches={data?.branches ?? []}
              isLoading={isLoading}
              sortBy={filters.sortBy ?? "name"}
              sortOrder={filters.sortOrder ?? "asc"}
              onSort={handleSort}
              onViewDetails={(branch) => setSelectedBranchId(branch.id)}
              onEdit={setEditTarget}
              onActivate={setActivateTarget}
              onDeactivate={setDeactivateTarget}
              onDelete={setDeleteTarget}
            />
            {data && (
              <DataPagination
                meta={data.meta}
                onPageChange={(page) => setFilters({ page })}
                onLimitChange={(limit) => setFilters({ limit })}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
              />
            )}
          </>
        )}
      </div>

      <BranchDetailsDrawer
        branchId={selectedBranchId}
        open={!!selectedBranchId}
        onOpenChange={(open) => !open && setSelectedBranchId(null)}
      />
      <EditBranchDialog
        branch={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />
      <ActivateBranchDialog
        branch={activateTarget}
        open={!!activateTarget}
        onOpenChange={(open) => !open && setActivateTarget(null)}
      />
      <DeactivateBranchDialog
        branch={deactivateTarget}
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      />
      <DeleteBranchDialog
        branch={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}
