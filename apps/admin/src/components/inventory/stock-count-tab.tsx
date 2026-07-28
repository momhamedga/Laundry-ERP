"use client";

import { ClipboardList, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useItemsQuery, useStockCountMutation } from "@/hooks/use-inventory";
import { fmtQty, UNIT_LABELS } from "./inventory-format";

/** جرد مخزون - إدخال المعدود لكل صنف ثم التطبيق (الفروق تُسوّى تلقائياً) */
export function StockCountTab() {
  const { data, isLoading } = useItemsQuery({ limit: 100, isActive: true, sortBy: "name", sortOrder: "asc" });
  const mutation = useStockCountMutation();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");

  const items = data?.items ?? [];
  const edited = Object.entries(counts).filter(([, v]) => v !== "" && !Number.isNaN(Number(v)));

  async function submit() {
    const lines = edited.map(([itemId, v]) => ({ itemId, countedQuantity: Number(v) }));
    if (lines.length === 0) return;
    try {
      await mutation.mutateAsync({ note: note || null, lines });
      setCounts({});
      setNote("");
    } catch {
      // toast عبر onError
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>جرد المخزون</CardTitle>
            <CardDescription>أدخل الكمية المعدودة فعلياً - الفروق تُسوّى تلقائياً بحركة تسوية</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="ملاحظة الجرد" className="h-8 w-48" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button size="sm" disabled={edited.length === 0 || mutation.isPending} onClick={() => void submit()}>
              {mutation.isPending ? <Spinner className="size-3.5 text-primary-foreground" /> : <Save aria-hidden />}
              تطبيق ({edited.length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={ClipboardList} title="لا توجد أصناف للجرد" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead className="text-end">رصيد النظام</TableHead>
                  <TableHead className="text-end">المعدود</TableHead>
                  <TableHead className="text-end">الفرق</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => {
                  const counted = counts[it.id];
                  const diff = counted !== undefined && counted !== "" ? Number(counted) - Number(it.quantity) : null;
                  return (
                    <TableRow key={it.id}>
                      <TableCell>
                        {it.name} <span className="text-xs text-muted-foreground">{UNIT_LABELS[it.unit]}</span>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{fmtQty(it.quantity)}</TableCell>
                      <TableCell className="text-end">
                        <Input
                          type="number"
                          step="any"
                          className="h-8 w-28 text-end"
                          value={counted ?? ""}
                          onChange={(e) => setCounts((c) => ({ ...c, [it.id]: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell className={`text-end tabular-nums ${diff === null ? "text-muted-foreground" : diff === 0 ? "" : diff > 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {diff === null ? "—" : diff > 0 ? `+${fmtQty(diff)}` : fmtQty(diff)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
