"use client";

import { BellRing, Check } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useAlertsQuery, useResolveAlertMutation } from "@/hooks/use-inventory";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import { formatDateTime } from "@/lib/format";
import { ALERT_LABELS, fmtQty } from "./inventory-format";

export function AlertsTab() {
  const { can } = usePermissions();
  const canManage = can("inventory:manage");
  const [params, setParams] = useState<{ page: number; limit: number; status?: string }>({
    page: 1,
    limit: 20,
    status: "OPEN",
  });
  const { data, isLoading, isError, error, refetch } = useAlertsQuery(params);
  const resolveMutation = useResolveAlertMutation();

  const alerts = data?.alerts ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select
          value={params.status ?? "all"}
          onValueChange={(v) => setParams((p) => ({ ...p, status: !v || v === "all" ? undefined : v, page: 1 }))}
        >
          <SelectTrigger size="sm" className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="OPEN">مفتوحة</SelectItem>
            <SelectItem value="RESOLVED">مُغلقة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border">
        {isLoading && !data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : alerts.length === 0 ? (
          <EmptyState icon={BellRing} title="لا توجد تنبيهات" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الصنف</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead className="text-end">الرصيد</TableHead>
                    <TableHead className="text-end">الحد</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead className="text-end">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        {a.item.name} <span dir="ltr" className="text-xs text-muted-foreground">{a.item.sku}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.type === "OUT_OF_STOCK" ? "destructive" : "secondary"}>{ALERT_LABELS[a.type]}</Badge>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{fmtQty(a.quantity)}</TableCell>
                      <TableCell className="text-end tabular-nums">{fmtQty(a.threshold)}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "OPEN" ? "outline" : "default"}>
                          {a.status === "OPEN" ? "مفتوح" : "مُغلق"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDateTime(a.createdAt)}</TableCell>
                      <TableCell className="text-end">
                        {a.status === "OPEN" && canManage && (
                          <Button variant="ghost" size="icon-sm" title="إغلاق" disabled={resolveMutation.isPending} onClick={() => resolveMutation.mutate(a.id)}>
                            <Check aria-hidden />
                          </Button>
                        )}
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
    </div>
  );
}
