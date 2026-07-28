"use client";

import { History } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination } from "@/components/tables/data-pagination";
import { usePrintHistoryQuery } from "@/hooks/use-barcode";
import { getErrorMessage } from "@/lib/axios";
import { formatDateTime } from "@/lib/format";
import { LABEL_SIZE_LABELS } from "./barcode-format";

export function PrintHistoryTab() {
  const [params, setParams] = useState<{ page: number; limit: number }>({ page: 1, limit: 20 });
  const { data, isLoading, isError, error, refetch } = usePrintHistoryQuery(params);
  const logs = data?.logs ?? [];

  return (
    <div className="rounded-xl border">
      {isLoading && !data ? (
        <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : isError ? (
        <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : logs.length === 0 ? (
        <EmptyState icon={History} title="لا يوجد سجل طباعة" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>المقاس</TableHead>
                  <TableHead className="text-end">عدد الملصقات</TableHead>
                  <TableHead>القالب</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      {l.item ? (
                        <>{l.item.name} <span dir="ltr" className="text-xs text-muted-foreground">{l.item.sku}</span></>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{LABEL_SIZE_LABELS[l.size]}</TableCell>
                    <TableCell className="text-end tabular-nums">{l.quantity}</TableCell>
                    <TableCell className="text-sm">{l.templateName ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(l.createdAt)}</TableCell>
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
  );
}
