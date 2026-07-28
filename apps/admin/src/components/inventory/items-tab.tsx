"use client";

import { AlertTriangle, ArrowLeftRight, Boxes, DollarSign, Package, Pencil, Plus, RotateCw, Sliders, Trash2 } from "lucide-react";
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
import {
  useDeleteItemMutation,
  useInventoryStatsQuery,
  useItemsQuery,
  useRestoreItemMutation,
} from "@/hooks/use-inventory";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency } from "@/lib/format";
import type { InventoryItem, InventoryItemType, ListItemsParams } from "@/types/inventory";
import { fmtQty, ITEM_TYPE_LABELS, UNIT_LABELS } from "./inventory-format";
import { ItemFormDialog } from "./item-form-dialog";
import { MovementDialog } from "./movement-dialog";
import { TransferDialog } from "./transfer-dialog";

const PAGE_SIZES = [10, 20, 50, 100] as const;

export function ItemsTab() {
  const { can } = usePermissions();
  const [params, setParams] = useState<ListItemsParams>({ page: 1, limit: 20 });
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch } = useItemsQuery(params);
  const { data: stats } = useInventoryStatsQuery();
  const deleteMutation = useDeleteItemMutation();
  const restoreMutation = useRestoreItemMutation();

  const [formItem, setFormItem] = useState<InventoryItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<InventoryItem | null>(null);
  const [moveMode, setMoveMode] = useState<"movement" | "adjust">("movement");
  const [moveOpen, setMoveOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [toDelete, setToDelete] = useState<InventoryItem | null>(null);

  const canCreate = can("inventory:create");
  const canUpdate = can("inventory:update");
  const canManage = can("inventory:manage");
  const canDelete = can("inventory:delete");

  function applySearch() {
    setParams((p) => ({ ...p, search: search.trim() || undefined, page: 1 }));
  }

  function openNew() {
    setFormItem(null);
    setFormOpen(true);
  }
  function openEdit(item: InventoryItem) {
    setFormItem(item);
    setFormOpen(true);
  }
  function openMovement(item: InventoryItem, mode: "movement" | "adjust") {
    setMoveItem(item);
    setMoveMode(mode);
    setMoveOpen(true);
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="إجمالي الأصناف" value={String(stats.totalItems)} icon={Package} />
          <StatCard label="قيمة المخزون" value={formatCurrency(stats.totalStockValue)} icon={DollarSign} tone="success" />
          <StatCard label="نقص المخزون" value={String(stats.lowStockCount)} icon={AlertTriangle} tone={stats.lowStockCount > 0 ? "warn" : "default"} />
          <StatCard label="نفاد المخزون" value={String(stats.outOfStockCount)} icon={Boxes} tone={stats.outOfStockCount > 0 ? "danger" : "default"} />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="بحث بالاسم أو SKU…"
          className="h-8 w-56"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applySearch()}
        />
        <Select
          value={params.type ?? "all"}
          onValueChange={(v) => setParams((p) => ({ ...p, type: v === "all" ? undefined : (v as InventoryItemType), page: 1 }))}
        >
          <SelectTrigger size="sm" className="w-32"><SelectValue placeholder="النوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            <SelectItem value="PRODUCT">منتج</SelectItem>
            <SelectItem value="RAW_MATERIAL">مادة خام</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={params.lowStock ? "default" : "outline"}
          size="sm"
          onClick={() => setParams((p) => ({ ...p, lowStock: p.lowStock ? undefined : true, page: 1 }))}
        >
          <AlertTriangle aria-hidden /> نقص المخزون
        </Button>
        <div className="ms-auto flex gap-2">
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight aria-hidden /> تحويل
            </Button>
          )}
          {canCreate && (
            <Button size="sm" onClick={openNew}>
              <Plus aria-hidden /> صنف جديد
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        {isLoading && !data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : items.length === 0 ? (
          <EmptyState icon={Package} title="لا توجد أصناف" description="أضف أول صنف للبدء" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>الصنف</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead className="text-end">الرصيد</TableHead>
                    <TableHead className="text-end">حد الطلب</TableHead>
                    <TableHead className="text-end">التكلفة</TableHead>
                    <TableHead className="text-end">القيمة</TableHead>
                    <TableHead className="text-end">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => {
                    const qty = Number(it.quantity);
                    const reorder = Number(it.reorderLevel);
                    const low = qty <= 0 ? "out" : reorder > 0 && qty <= reorder ? "low" : null;
                    return (
                      <TableRow key={it.id} className={it.isActive ? undefined : "opacity-60"}>
                        <TableCell dir="ltr" className="text-xs">{it.sku}</TableCell>
                        <TableCell>
                          {it.name}
                          {!it.isActive && <span className="text-xs text-muted-foreground"> (معطّل)</span>}
                        </TableCell>
                        <TableCell className="text-sm">{ITEM_TYPE_LABELS[it.type]}</TableCell>
                        <TableCell className="text-end">
                          <span className="tabular-nums">{fmtQty(it.quantity)}</span>{" "}
                          <span className="text-xs text-muted-foreground">{UNIT_LABELS[it.unit]}</span>
                          {low === "out" && <Badge variant="destructive" className="ms-1">نفاد</Badge>}
                          {low === "low" && <Badge variant="secondary" className="ms-1">نقص</Badge>}
                        </TableCell>
                        <TableCell className="text-end tabular-nums text-sm">{fmtQty(it.reorderLevel)}</TableCell>
                        <TableCell className="text-end text-sm">{formatCurrency(it.costPrice)}</TableCell>
                        <TableCell className="text-end text-sm">{formatCurrency(qty * Number(it.costPrice))}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && it.isActive && (
                              <Button variant="ghost" size="icon-sm" title="حركة" onClick={() => openMovement(it, "movement")}>
                                <ArrowLeftRight aria-hidden />
                              </Button>
                            )}
                            {canManage && it.isActive && (
                              <Button variant="ghost" size="icon-sm" title="تعديل الرصيد" onClick={() => openMovement(it, "adjust")}>
                                <Sliders aria-hidden />
                              </Button>
                            )}
                            {canUpdate && (
                              <Button variant="ghost" size="icon-sm" title="تعديل" onClick={() => openEdit(it)}>
                                <Pencil aria-hidden />
                              </Button>
                            )}
                            {canDelete && it.isActive && (
                              <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" title="تعطيل" onClick={() => setToDelete(it)}>
                                <Trash2 aria-hidden />
                              </Button>
                            )}
                            {canUpdate && !it.isActive && (
                              <Button variant="ghost" size="icon-sm" title="استرجاع" disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(it.id)}>
                                <RotateCw aria-hidden />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {data && (
              <DataPagination
                meta={data.meta}
                onPageChange={(page) => setParams((p) => ({ ...p, page }))}
                onLimitChange={(limit) => setParams((p) => ({ ...p, limit, page: 1 }))}
                pageSizeOptions={PAGE_SIZES}
              />
            )}
          </>
        )}
      </div>

      <ItemFormDialog item={formItem} open={formOpen} onOpenChange={setFormOpen} />
      <MovementDialog item={moveItem} mode={moveMode} open={moveOpen} onOpenChange={setMoveOpen} />
      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} />

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تعطيل الصنف؟</AlertDialogTitle>
            <AlertDialogDescription>{toDelete?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (toDelete) deleteMutation.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
              }}
            >
              {deleteMutation.isPending && <Spinner className="text-destructive" />}
              تعطيل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: typeof Package;
  tone?: "default" | "success" | "warn" | "danger";
}) {
  const color =
    tone === "success" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : tone === "danger" ? "text-destructive" : "text-muted-foreground";
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-2 p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-lg font-bold" title={value}>{value}</p>
        </div>
        <Icon aria-hidden className={`size-5 shrink-0 ${color}`} />
      </CardContent>
    </Card>
  );
}
