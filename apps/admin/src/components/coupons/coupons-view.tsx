"use client";

import { Plus, Tag, Trash2 } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination } from "@/components/tables/data-pagination";
import { useCouponStatsQuery, useCouponsQuery, useDeleteCouponMutation } from "@/hooks/use-coupons";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency } from "@/lib/format";
import type { Coupon, ListCouponsParams } from "@/types/loyalty";
import { COUPON_TYPE_LABELS } from "@/components/loyalty/loyalty-format";
import { CouponFormDialog } from "./coupon-form-dialog";

export function CouponsView() {
  const { can } = usePermissions();
  const canManage = can("coupon:manage");
  const [params, setParams] = useState<ListCouponsParams>({ page: 1, limit: 20 });
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error, refetch } = useCouponsQuery(params);
  const { data: stats } = useCouponStatsQuery();
  const deleteMutation = useDeleteCouponMutation();
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Coupon | null>(null);

  const coupons = data?.coupons ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="الكوبونات"
        description="خصومات وكوبونات العملاء"
        actions={canManage ? <Button size="sm" onClick={() => setFormOpen(true)}><Plus aria-hidden /> كوبون جديد</Button> : undefined}
      />

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="إجمالي الكوبونات" value={String(stats.totalCoupons)} />
          <Stat label="النشطة" value={String(stats.activeCoupons)} />
          <Stat label="مرات الاستخدام" value={String(stats.totalRedemptions)} />
          <Stat label="إجمالي الخصم" value={formatCurrency(stats.totalDiscountGiven)} />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input placeholder="بحث بالكود…" className="h-8 w-56" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setParams((p) => ({ ...p, search: search.trim() || undefined, page: 1 }))} />
      </div>

      <div className="rounded-xl border">
        {isLoading && !data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : coupons.length === 0 ? (
          <EmptyState icon={Tag} title="لا توجد كوبونات" description="أنشئ أول كوبون" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الكود</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead className="text-end">القيمة</TableHead>
                    <TableHead className="text-end">الاستخدام</TableHead>
                    <TableHead>الحالة</TableHead>
                    {canManage && <TableHead className="text-end">إجراء</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell dir="ltr" className="font-mono text-sm">{c.code}</TableCell>
                      <TableCell className="text-sm">{COUPON_TYPE_LABELS[c.type]}</TableCell>
                      <TableCell className="text-end">{c.type === "PERCENTAGE" ? `${Number(c.value)}%` : formatCurrency(c.value)}</TableCell>
                      <TableCell className="text-end tabular-nums">{c.usedCount}{c.usageLimit != null ? `/${c.usageLimit}` : ""}</TableCell>
                      <TableCell><Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "نشط" : "متوقف"}</Badge></TableCell>
                      {canManage && (
                        <TableCell className="text-end">
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setToDelete(c)}><Trash2 aria-hidden /></Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {data && (
              <DataPagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} onLimitChange={(limit) => setParams((p) => ({ ...p, limit, page: 1 }))} pageSizeOptions={[10, 20, 50, 100]} />
            )}
          </>
        )}
      </div>

      <CouponFormDialog open={formOpen} onOpenChange={setFormOpen} />

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الكوبون؟</AlertDialogTitle>
            <AlertDialogDescription dir="ltr" className="text-right">{toDelete?.code}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deleteMutation.isPending} onClick={() => { if (toDelete) deleteMutation.mutate(toDelete.id, { onSuccess: () => setToDelete(null) }); }}>
              {deleteMutation.isPending && <Spinner className="text-destructive" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></CardContent></Card>
  );
}
