"use client";

import { UserCog } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DataPagination } from "@/components/tables/data-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PAGE_SIZE_OPTIONS } from "@/constants/users";
import { getErrorMessage } from "@/lib/axios";
import { useUsersQuery } from "@/hooks/use-users";
import { useUsersFilters } from "@/hooks/use-users-filters";
import type { User } from "@/types/user";
import { ActivateUserDialog } from "./activate-user-dialog";
import { DeactivateUserDialog } from "./deactivate-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { UserDetailsDrawer } from "./user-details-drawer";
import { UsersTable } from "./users-table";
import { UsersToolbar } from "./users-toolbar";

/** جسم صفحة قائمة المستخدمين - يستخدم useSearchParams لذا يُستدعى داخل Suspense من page.tsx */
export function UsersView() {
  const { filters, setFilters, resetFilters } = useUsersFilters();
  const { data, isLoading, isError, error, refetch } = useUsersQuery(filters);

  const [searchResetKey, setSearchResetKey] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<User | null>(null);
  const [activateTarget, setActivateTarget] = useState<User | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);

  const hasActiveFilters = !!(filters.search || filters.role || filters.isActive !== undefined);

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
      <PageHeader title="المستخدمون" description="إدارة موظفي المغسلة وصلاحياتهم" />

      <UsersToolbar
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
        ) : !isLoading && data?.users.length === 0 ? (
          <div className="p-2">
            <EmptyState
              icon={UserCog}
              title={hasActiveFilters ? "لا توجد نتائج مطابقة" : "لا يوجد مستخدمون بعد"}
              description={hasActiveFilters ? "جرّب تعديل الفلاتر أو البحث" : undefined}
            />
          </div>
        ) : (
          <>
            <UsersTable
              users={data?.users ?? []}
              isLoading={isLoading}
              sortBy={filters.sortBy ?? "createdAt"}
              sortOrder={filters.sortOrder ?? "desc"}
              onSort={handleSort}
              onViewDetails={setSelectedUser}
              onEdit={setEditTarget}
              onResetPassword={setResetPasswordTarget}
              onActivate={setActivateTarget}
              onDeactivate={setDeactivateTarget}
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

      <UserDetailsDrawer
        userId={selectedUser?.id ?? null}
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      />
      <EditUserDialog
        user={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />
      <ResetPasswordDialog
        user={resetPasswordTarget}
        open={!!resetPasswordTarget}
        onOpenChange={(open) => !open && setResetPasswordTarget(null)}
      />
      <ActivateUserDialog
        user={activateTarget}
        open={!!activateTarget}
        onOpenChange={(open) => !open && setActivateTarget(null)}
      />
      <DeactivateUserDialog
        user={deactivateTarget}
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      />
    </div>
  );
}
