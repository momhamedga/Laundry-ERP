"use client";

import { History } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination } from "@/components/tables/data-pagination";
import { useMovementsQuery } from "@/hooks/use-inventory";
import { getErrorMessage } from "@/lib/axios";
import { formatDateTime } from "@/lib/format";
import type { ListMovementsParams, MovementType } from "@/types/inventory";
import { fmtQty, MOVEMENT_LABELS } from "./inventory-format";

const TYPES: MovementType[] = ["IN", "OUT", "RETURN", "ADJUSTMENT", "LOSS", "TRANSFER", "OPENING", "CLOSING"];

const INCREASE = new Set<MovementType>(["IN", "RETURN", "OPENING"]);

export function MovementsTab() {
  const [params, setParams] = useState<ListMovementsParams>({ page: 1, limit: 20 });
  const { data, isLoading, isError, error, refetch } = useMovementsQuery(params);
  const movements = data?.movements ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select
          value={params.type ?? "all"}
          onValueChange={(v) => setParams((p) => ({ ...p, type: v === "all" ? undefined : (v as MovementType), page: 1 }))}
        >
          <SelectTrigger size="sm" className="w-40"><SelectValue placeholder="النوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحركات</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>{MOVEMENT_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border">
        {isLoading && !data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : movements.length === 0 ? (
          <EmptyState icon={History} title="لا توجد حركات" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الصنف</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead className="text-end">الكمية</TableHead>
                    <TableHead className="text-end">قبل</TableHead>
                    <TableHead className="text-end">بعد</TableHead>
                    <TableHead>المرجع</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        {m.item.name} <span dir="ltr" className="text-xs text-muted-foreground">{m.item.sku}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={INCREASE.has(m.type) ? "default" : "secondary"}>{MOVEMENT_LABELS[m.type]}</Badge>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{fmtQty(m.quantity)}</TableCell>
                      <TableCell className="text-end tabular-nums text-muted-foreground">{fmtQty(m.beforeQuantity)}</TableCell>
                      <TableCell className="text-end tabular-nums font-medium">{fmtQty(m.afterQuantity)}</TableCell>
                      <TableCell className="text-xs" dir="ltr">{m.reference ?? "—"}</TableCell>
                      <TableCell className="text-sm">{formatDateTime(m.createdAt)}</TableCell>
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
    </div>
  );
}
