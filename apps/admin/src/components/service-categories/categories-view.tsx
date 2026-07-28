"use client";

import { Layers } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DataPagination } from "@/components/tables/data-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PAGE_SIZE_OPTIONS } from "@/constants/service-categories";
import { useCategoriesQuery, useCategoryStatsQuery } from "@/hooks/use-service-categories";
import { useCategoriesFilters } from "@/hooks/use-service-categories-filters";
import type { CategoryWithCount } from "@/types/service-category";
import { CategoriesTable } from "./categories-table";
import { CategoriesToolbar } from "./categories-toolbar";
import { CategoryStatsCards } from "./category-stats-cards";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import { DisableCategoryDialog } from "./disable-category-dialog";
import { EditCategoryDialog } from "./edit-category-dialog";

/** جسم صفحة قائمة التصنيفات - يستخدم useSearchParams لذا يُستدعى داخل Suspense من page.tsx */
export function CategoriesView() {
  const { filters, setFilters, resetFilters } = useCategoriesFilters();
  const { data, isLoading, isError, refetch } = useCategoriesQuery(filters);
  const { data: stats } = useCategoryStatsQuery();

  const [searchResetKey, setSearchResetKey] = useState(0);
  const [editTarget, setEditTarget] = useState<CategoryWithCount | null>(null);
  const [disableTarget, setDisableTarget] = useState<CategoryWithCount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);

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
      <PageHeader title="تصنيفات الخدمات" description="تنظيم الخدمات ضمن تصنيفات قابلة للترتيب" />

      {stats && <CategoryStatsCards stats={stats} />}

      <CategoriesToolbar
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleReset}
        hasActiveFilters={hasActiveFilters}
        searchResetKey={searchResetKey}
      />

      <div className="rounded-xl border">
        {isError ? (
          <div className="p-2">
            <ErrorState description="تعذر تحميل قائمة التصنيفات" onRetry={() => void refetch()} />
          </div>
        ) : !isLoading && data?.categories.length === 0 ? (
          <div className="p-2">
            <EmptyState
              icon={Layers}
              title={hasActiveFilters ? "لا توجد نتائج مطابقة" : "لا توجد تصنيفات بعد"}
              description={hasActiveFilters ? "جرّب تعديل البحث" : "ابدأ بإضافة أول تصنيف"}
            />
          </div>
        ) : (
          <>
            <CategoriesTable
              categories={data?.categories ?? []}
              isLoading={isLoading}
              sortBy={filters.sortBy ?? "sortOrder"}
              sortOrder={filters.sortOrder ?? "asc"}
              onSort={handleSort}
              onEdit={setEditTarget}
              onDisable={setDisableTarget}
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

      <EditCategoryDialog
        category={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />
      <DisableCategoryDialog
        category={disableTarget}
        open={!!disableTarget}
        onOpenChange={(open) => !open && setDisableTarget(null)}
      />
      <DeleteCategoryDialog
        category={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}
