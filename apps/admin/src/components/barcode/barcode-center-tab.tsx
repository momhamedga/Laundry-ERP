"use client";

import { Barcode, Package, Plus, Printer, QrCode, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useItemsQuery } from "@/hooks/use-inventory";
import {
  useBarcodeStatsQuery,
  useBulkGenerateMutation,
  useDeleteBarcodeMutation,
} from "@/hooks/use-barcode";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import { usePrintQueueStore } from "@/store/print-queue-store";
import type { InventoryItem, ListItemsParams } from "@/types/inventory";
import type { BarcodeType } from "@/types/barcode";
import { BARCODE_TYPE_LABELS } from "./barcode-format";
import { GenerateDialog } from "./generate-dialog";

export function BarcodeCenterTab() {
  const { can } = usePermissions();
  const canCreate = can("barcode:create");
  const canManage = can("barcode:manage");
  const canPrint = can("barcode:print");

  const [params, setParams] = useState<ListItemsParams>({ page: 1, limit: 20 });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkType, setBulkType] = useState<BarcodeType>("EAN13");
  const [genItem, setGenItem] = useState<InventoryItem | null>(null);
  const [genOpen, setGenOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useItemsQuery(params);
  const { data: stats } = useBarcodeStatsQuery();
  const bulkMutation = useBulkGenerateMutation();
  const deleteMutation = useDeleteBarcodeMutation();
  const addToQueue = usePrintQueueStore((s) => s.add);

  const items = data?.items ?? [];

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openGenerate(item: InventoryItem) {
    setGenItem(item);
    setGenOpen(true);
  }

  function queueItem(item: InventoryItem) {
    if (!item.barcode) return;
    addToQueue({
      itemId: item.id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode ?? null,
      barcodeType: (item.barcodeType ?? null) as BarcodeType | null,
      qrCode: item.qrCode ?? null,
      price: Number(item.sellPrice),
      category: item.category,
    });
  }

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="إجمالي الأصناف" value={String(stats.totalItems)} icon={Package} />
          <StatCard label="لها باركود" value={String(stats.withBarcode)} icon={Barcode} tone="success" />
          <StatCard label="بلا باركود" value={String(stats.missingBarcode)} icon={QrCode} tone={stats.missingBarcode > 0 ? "warn" : "default"} />
          <StatCard label="باركود غير صالح" value={String(stats.invalidBarcode)} icon={Barcode} tone={stats.invalidBarcode > 0 ? "danger" : "default"} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="بحث بالاسم أو SKU…"
          className="h-8 w-56"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setParams((p) => ({ ...p, search: search.trim() || undefined, page: 1 }))}
        />
        {canCreate && selected.size > 0 && (
          <div className="ms-auto flex items-center gap-2 rounded-lg border bg-muted/40 px-2 py-1">
            <span className="text-sm">{selected.size} محدّد</span>
            <Select value={bulkType} onValueChange={(v) => v && setBulkType(v as BarcodeType)}>
              <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(BARCODE_TYPE_LABELS) as BarcodeType[]).map((t) => (
                  <SelectItem key={t} value={t}>{BARCODE_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={bulkMutation.isPending}
              onClick={() =>
                bulkMutation.mutate(
                  { itemIds: [...selected], type: bulkType, skipExisting: true },
                  { onSuccess: () => setSelected(new Set()) },
                )
              }
            >
              {bulkMutation.isPending ? <Spinner className="size-3.5 text-primary-foreground" /> : <Barcode aria-hidden />}
              توليد جماعي
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border">
        {isLoading && !data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : items.length === 0 ? (
          <EmptyState icon={Package} title="لا توجد أصناف" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>الصنف</TableHead>
                    <TableHead>الباركود</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead className="text-end">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <Checkbox checked={selected.has(it.id)} onCheckedChange={() => toggle(it.id)} aria-label="تحديد" />
                      </TableCell>
                      <TableCell dir="ltr" className="text-xs">{it.sku}</TableCell>
                      <TableCell>{it.name}</TableCell>
                      <TableCell>
                        {it.barcode ? (
                          <span dir="ltr" className="font-mono text-xs">{it.barcode}</span>
                        ) : (
                          <Badge variant="outline">بلا باركود</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {it.barcodeType ? BARCODE_TYPE_LABELS[it.barcodeType as BarcodeType] : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {canPrint && it.barcode && (
                            <Button variant="ghost" size="icon-sm" title="أضف لطابور الطباعة" onClick={() => queueItem(it)}>
                              <Printer aria-hidden />
                            </Button>
                          )}
                          {canCreate && !it.barcode && (
                            <Button variant="ghost" size="icon-sm" title="توليد" onClick={() => openGenerate(it)}>
                              <Plus aria-hidden />
                            </Button>
                          )}
                          {canCreate && it.barcode && (
                            <Button variant="ghost" size="icon-sm" title="إعادة توليد" onClick={() => openGenerate(it)}>
                              <RefreshCw aria-hidden />
                            </Button>
                          )}
                          {canManage && it.barcode && (
                            <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" title="حذف الباركود" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(it.id)}>
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
                onPageChange={(page) => setParams((p) => ({ ...p, page }))}
                onLimitChange={(limit) => setParams((p) => ({ ...p, limit, page: 1 }))}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            )}
          </>
        )}
      </div>

      <GenerateDialog item={genItem} open={genOpen} onOpenChange={setGenOpen} />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone = "default" }: { label: string; value: string; icon: typeof Package; tone?: "default" | "success" | "warn" | "danger" }) {
  const color = tone === "success" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : tone === "danger" ? "text-destructive" : "text-muted-foreground";
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-2 p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-lg font-bold">{value}</p>
        </div>
        <Icon aria-hidden className={`size-5 shrink-0 ${color}`} />
      </CardContent>
    </Card>
  );
}
