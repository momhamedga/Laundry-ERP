"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DataPagination } from "@/components/tables/data-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PAGE_SIZE_OPTIONS } from "@/constants/services";
import { useAllCategoriesQuery } from "@/hooks/use-service-categories";
import { useServicesQuery, useServiceStatsQuery } from "@/hooks/use-services";
import { useServicesFilters } from "@/hooks/use-services-filters";
import type { Service } from "@/types/service";
import { DeleteServiceDialog } from "./delete-service-dialog";
import { EditServiceDialog } from "./edit-service-dialog";
import { RestoreServiceDialog } from "./restore-service-dialog";
import { ServiceDetailsDrawer } from "./service-details-drawer";
import { ServiceStatsCards } from "./service-stats-cards";
import { ServicesTable } from "./services-table";
import { ServicesToolbar } from "./services-toolbar";

/** جسم صفحة قائمة الخدمات - يستخدم useSearchParams لذا يُستدعى داخل Suspense من page.tsx */
export function ServicesView() {
  const { filters, setFilters, resetFilters } = useServicesFilters();
  const { data, isLoading, isError, refetch } = useServicesQuery(filters);
  const { data: stats } = useServiceStatsQuery();
  const { data: categoriesData } = useAllCategoriesQuery();
  const categories = categoriesData?.categories ?? [];

  const [searchResetKey, setSearchResetKey] = useState(0);
  const [detailsTarget, setDetailsTarget] = useState<Service | null>(null);
  const [editTarget, setEditTarget] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Service | null>(null);

  const hasActiveFilters = !!(
    filters.search ||
    filters.categoryId ||
    filters.unit ||
    filters.isActive !== undefined ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined
  );

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
      <PageHeader title="الخدمات" description="إدارة خدمات المغسلة وأسعارها" />

      {stats && <ServiceStatsCards stats={stats} />}

      <ServicesToolbar
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleReset}
        hasActiveFilters={hasActiveFilters}
        searchResetKey={searchResetKey}
        categories={categories}
      />

      <div className="rounded-xl border">
        {isError ? (
          <div className="p-2">
            <ErrorState description="تعذر تحميل قائمة الخدمات" onRetry={() => void refetch()} />
          </div>
        ) : !isLoading && data?.services.length === 0 ? (
          <div className="p-2">
            <EmptyState
              icon={Sparkles}
              title={hasActiveFilters ? "لا توجد نتائج مطابقة" : "لا توجد خدمات بعد"}
              description={
                hasActiveFilters ? "جرّب تعديل الفلاتر أو البحث" : "ابدأ بإضافة أول خدمة"
              }
            />
          </div>
        ) : (
          <>
            <ServicesTable
              services={data?.services ?? []}
              isLoading={isLoading}
              sortBy={filters.sortBy ?? "sortOrder"}
              sortOrder={filters.sortOrder ?? "asc"}
              onSort={handleSort}
              onViewDetails={setDetailsTarget}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
              onRestore={setRestoreTarget}
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

      <ServiceDetailsDrawer
        service={detailsTarget}
        open={!!detailsTarget}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
      />
      <EditServiceDialog
        service={editTarget}
        categories={categories}
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />
      <DeleteServiceDialog
        service={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
      <RestoreServiceDialog
        service={restoreTarget}
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
      />
    </div>
  );
}
