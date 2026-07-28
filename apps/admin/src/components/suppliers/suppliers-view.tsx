"use client";

import { Pencil, Plus, RotateCw, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination } from "@/components/tables/data-pagination";
import {
  useDisableSupplierMutation,
  useRestoreSupplierMutation,
  useSuppliersQuery,
} from "@/hooks/use-suppliers";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import type { ListSuppliersParams, Supplier } from "@/types/inventory";
import { SupplierFormDialog } from "./supplier-form-dialog";

export function SuppliersView() {
  const { can } = usePermissions();
  const canManage = can("supplier:manage");
  const [params, setParams] = useState<ListSuppliersParams>({ page: 1, limit: 20 });
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error, refetch } = useSuppliersQuery(params);
  const disableMutation = useDisableSupplierMutation();
  const restoreMutation = useRestoreSupplierMutation();

  const [formSupplier, setFormSupplier] = useState<Supplier | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDisable, setToDisable] = useState<Supplier | null>(null);

  const suppliers = data?.suppliers ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="الموردون"
        description="إدارة الموردين وأرصدة المشتريات"
        actions={
          canManage ? (
            <Button size="sm" onClick={() => { setFormSupplier(null); setFormOpen(true); }}>
              <Plus aria-hidden /> مورّد جديد
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-2">
        <Input
          placeholder="بحث بالاسم أو الهاتف…"
          className="h-8 w-56"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setParams((p) => ({ ...p, search: search.trim() || undefined, page: 1 }))}
        />
      </div>

      <div className="rounded-xl border">
        {isLoading && !data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : suppliers.length === 0 ? (
          <EmptyState icon={Truck} title="لا يوجد موردون" description="أضف أول مورّد" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>المسؤول</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-end">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s) => (
                    <TableRow key={s.id} className={s.isActive ? undefined : "opacity-60"}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell className="text-sm">{s.contactName ?? "—"}</TableCell>
                      <TableCell dir="ltr" className="text-sm">{s.phone ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "نشط" : "معطّل"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {canManage && (
                            <Button variant="ghost" size="icon-sm" title="تعديل" onClick={() => { setFormSupplier(s); setFormOpen(true); }}>
                              <Pencil aria-hidden />
                            </Button>
                          )}
                          {canManage && s.isActive && (
                            <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" title="تعطيل" onClick={() => setToDisable(s)}>
                              <Trash2 aria-hidden />
                            </Button>
                          )}
                          {canManage && !s.isActive && (
                            <Button variant="ghost" size="icon-sm" title="استرجاع" disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(s.id)}>
                              <RotateCw aria-hidden />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {data && (
              <DataPagination
                meta={data.meta}
                onPageChange={(page) => setParams((p) => ({ ...p, page }))}
                onLimitChange={(limit) => setParams((p) => ({ ...p, limit, page: 1 }))}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            )}
          </>
        )}
      </div>

      <SupplierFormDialog supplier={formSupplier} open={formOpen} onOpenChange={setFormOpen} />

      <AlertDialog open={toDisable !== null} onOpenChange={(o) => !o && setToDisable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تعطيل المورّد؟</AlertDialogTitle>
            <AlertDialogDescription>{toDisable?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={disableMutation.isPending}
              onClick={() => { if (toDisable) disableMutation.mutate(toDisable.id, { onSuccess: () => setToDisable(null) }); }}
            >
              {disableMutation.isPending && <Spinner className="text-destructive" />}
              تعطيل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
