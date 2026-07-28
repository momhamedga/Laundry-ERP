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
import { useLoyaltyHistoryQuery } from "@/hooks/use-loyalty";
import { getErrorMessage } from "@/lib/axios";
import { formatDateTime } from "@/lib/format";
import type { HistoryParams, LoyaltyTxType } from "@/types/loyalty";
import { TX_TYPE_LABELS } from "./loyalty-format";

const POSITIVE = new Set<LoyaltyTxType>(["EARN", "BONUS", "WELCOME", "BIRTHDAY", "REFERRAL"]);

export function PointsHistoryTab() {
  const [params, setParams] = useState<HistoryParams>({ page: 1, limit: 20 });
  const { data, isLoading, isError, error, refetch } = useLoyaltyHistoryQuery(params);
  const transactions = data?.transactions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select
          value={params.type ?? "all"}
          onValueChange={(v) => setParams((p) => ({ ...p, type: !v || v === "all" ? undefined : (v as LoyaltyTxType), page: 1 }))}
        >
          <SelectTrigger size="sm" className="w-40"><SelectValue placeholder="النوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            {(Object.keys(TX_TYPE_LABELS) as LoyaltyTxType[]).map((t) => (
              <SelectItem key={t} value={t}>{TX_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border">
        {isLoading && !data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : transactions.length === 0 ? (
          <EmptyState icon={History} title="لا توجد حركات نقاط" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العميل</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead className="text-end">النقاط</TableHead>
                    <TableHead className="text-end">الرصيد بعد</TableHead>
                    <TableHead>المرجع</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.customer.name}</TableCell>
                      <TableCell><Badge variant={POSITIVE.has(t.type) ? "default" : "secondary"}>{TX_TYPE_LABELS[t.type]}</Badge></TableCell>
                      <TableCell className={`text-end tabular-nums font-medium ${t.points >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {t.points > 0 ? `+${t.points}` : t.points}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{t.balanceAfter}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.reference ?? "—"}</TableCell>
                      <TableCell className="text-sm">{formatDateTime(t.createdAt)}</TableCell>
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
