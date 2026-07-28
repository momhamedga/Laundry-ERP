"use client";

import { CheckCircle2, Eye, RotateCcw } from "lucide-react";
import { useState } from "react";
import { ExportDropdown } from "@/components/reports/export-dropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApproveDayMutation, useDayHistoryQuery } from "@/hooks/use-day-closing";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DayClosingView, DayStatus } from "@/types/day-closing";
import { DAY_STATUS_BADGE, DAY_STATUS_LABELS } from "./day-format";
import { DayDetailDialog } from "./day-detail-dialog";
import { ReopenDayDialog } from "./reopen-day-dialog";

type StatusFilter = DayStatus | "ALL";

export function HistoryTab() {
  const { can } = usePermissions();
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const query = useDayHistoryQuery({
    limit: 50,
    ...(status !== "ALL" ? { status } : {}),
  });
  const approve = useApproveDayMutation();

  const [detail, setDetail] = useState<DayClosingView | null>(null);
  const [reopenTarget, setReopenTarget] = useState<DayClosingView | null>(null);

  const canApprove = can("day:approve");
  const canReopen = can("day:reopen");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={status} onValueChange={(v) => v && setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل الحالات</SelectItem>
            <SelectItem value="OPEN">مفتوح</SelectItem>
            <SelectItem value="CLOSED">مُغلق</SelectItem>
            <SelectItem value="REOPENED">أُعيد فتحه</SelectItem>
          </SelectContent>
        </Select>
        <ExportDropdown
          type="day-closings"
          filters={status !== "ALL" ? { status } : {}}
          disabled={query.isLoading}
        />
      </div>

      {query.isError ? (
        <ErrorState
          title="تعذر تحميل سجل الإغلاق"
          description={getErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : query.isLoading || !query.data ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : query.data.closings.length === 0 ? (
        <EmptyState icon={Eye} title="لا يوجد سجل إغلاق" description="ستظهر أيام العمل المغلقة هنا." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-end">الإيراد</TableHead>
                  <TableHead className="text-end">المتوقع</TableHead>
                  <TableHead className="text-end">الفعلي</TableHead>
                  <TableHead className="text-end">الفرق</TableHead>
                  <TableHead>الإغلاق</TableHead>
                  <TableHead className="text-end">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.closings.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium tabular-nums">{d.businessDate}</TableCell>
                    <TableCell>
                      <Badge variant={DAY_STATUS_BADGE[d.status]}>{DAY_STATUS_LABELS[d.status]}</Badge>
                      {d.approvedAt && (
                        <Badge variant="outline" className="ms-1 text-success">
                          معتمد
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {formatCurrency(d.snapshot?.totalRevenue ?? 0)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {formatCurrency(d.expectedCash)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {d.actualCash === null ? "—" : formatCurrency(d.actualCash)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-end tabular-nums",
                        d.cashDifference !== null && d.cashDifference > 0 && "text-success",
                        d.cashDifference !== null && d.cashDifference < 0 && "text-destructive",
                      )}
                    >
                      {d.cashDifference === null ? "—" : formatCurrency(d.cashDifference)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(d.closedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="تفاصيل"
                          onClick={() => setDetail(d)}
                        >
                          <Eye aria-hidden />
                        </Button>
                        {canApprove && d.status === "CLOSED" && !d.approvedAt && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="اعتماد"
                            disabled={approve.isPending}
                            onClick={() => approve.mutate(d.id)}
                          >
                            <CheckCircle2 aria-hidden />
                          </Button>
                        )}
                        {canReopen && d.status === "CLOSED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="إعادة فتح"
                            onClick={() => setReopenTarget(d)}
                          >
                            <RotateCcw aria-hidden />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <DayDetailDialog day={detail} open={!!detail} onOpenChange={(o) => !o && setDetail(null)} />
      <ReopenDayDialog
        dayId={reopenTarget?.id ?? null}
        businessDate={reopenTarget?.businessDate ?? null}
        open={!!reopenTarget}
        onOpenChange={(o) => !o && setReopenTarget(null)}
      />
    </div>
  );
}
