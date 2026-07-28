"use client";

import { Eye, Plus, ShoppingBag, Trash2 } from "lucide-react";
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
import { PageHeader } from "@/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination } from "@/components/tables/data-pagination";
import { useDeletePurchaseMutation, usePurchasesQuery } from "@/hooks/use-purchases";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { ListPurchasesParams, PurchaseListRow, PurchaseStatus } from "@/types/inventory";
import { PURCHASE_STATUS_LABELS } from "@/components/inventory/inventory-format";
import { PurchaseDetailDialog } from "./purchase-detail-dialog";
import { PurchaseFormDialog } from "./purchase-form-dialog";

const STATUS_VARIANT: Record<PurchaseStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  ORDERED: "secondary",
  RECEIVED: "default",
  CANCELLED: "destructive",
};

export function PurchasesView() {
  const { can } = usePermissions();
  const canManage = can("purchase:manage");
  const [params, setParams] = useState<ListPurchasesParams>({ page: 1, limit: 20 });
  const { data, isLoading, isError, error, refetch } = usePurchasesQuery(params);
  const deleteMutation = useDeletePurchaseMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toDelete, setToDelete] = useState<PurchaseListRow | null>(null);

  const purchases = data?.purchases ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="المشتريات"
        description="أوامر الشراء من الموردين واستلام المخزون"
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus aria-hidden /> أمر شراء
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-2">
        <Select
          value={params.status ?? "all"}
          onValueChange={(v) => setParams((p) => ({ ...p, status: v === "all" ? undefined : (v as PurchaseStatus), page: 1 }))}
        >
          <SelectTrigger size="sm" className="w-36"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {(Object.keys(PURCHASE_STATUS_LABELS) as PurchaseStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{PURCHASE_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border">
        {isLoading && !data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : purchases.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="لا توجد مشتريات" description="أنشئ أول أمر شراء" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الرقم</TableHead>
                    <TableHead>المورّد</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-end">البنود</TableHead>
                    <TableHead className="text-end">الإجمالي</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead className="text-end">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell dir="ltr" className="text-xs">{p.purchaseNumber}</TableCell>
                      <TableCell>{p.supplier.name}</TableCell>
                      <TableCell><Badge variant={STATUS_VARIANT[p.status]}>{PURCHASE_STATUS_LABELS[p.status]}</Badge></TableCell>
                      <TableCell className="text-end tabular-nums">{p._count.items}</TableCell>
                      <TableCell className="text-end">{formatCurrency(p.total)}</TableCell>
                      <TableCell className="text-sm">{formatDateTime(p.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" title="عرض" onClick={() => { setDetailId(p.id); setDetailOpen(true); }}>
                            <Eye aria-hidden />
                          </Button>
                          {canManage && p.status === "DRAFT" && (
                            <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" title="حذف" onClick={() => setToDelete(p)}>
                              <Trash2 aria-hidden />
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
                onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
                onLimitChange={(limit) => setParams((prev) => ({ ...prev, limit, page: 1 }))}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            )}
          </>
        )}
      </div>

      <PurchaseFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <PurchaseDetailDialog purchaseId={detailId} open={detailOpen} onOpenChange={setDetailOpen} />

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف أمر الشراء؟</AlertDialogTitle>
            <AlertDialogDescription dir="ltr" className="text-right">{toDelete?.purchaseNumber}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => { if (toDelete) deleteMutation.mutate(toDelete.id, { onSuccess: () => setToDelete(null) }); }}
            >
              {deleteMutation.isPending && <Spinner className="text-destructive" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
