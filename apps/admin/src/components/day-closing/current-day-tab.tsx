"use client";

import { CalendarPlus, DoorClosed, Lock, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDayDashboardQuery } from "@/hooks/use-day-closing";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { CashMovementDialog } from "./cash-movement-dialog";
import { CloseDayDialog } from "./close-day-dialog";
import { OpenDayDialog } from "./open-day-dialog";
import { SnapshotCards } from "./snapshot-cards";

export function CurrentDayTab() {
  const { can } = usePermissions();
  const dashboard = useDayDashboardQuery();
  const [openDialog, setOpenDialog] = useState(false);
  const [cashDialog, setCashDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);

  if (dashboard.isError) {
    return (
      <ErrorState
        title="تعذر تحميل بيانات اليوم"
        description={getErrorMessage(dashboard.error)}
        onRetry={() => void dashboard.refetch()}
      />
    );
  }

  if (dashboard.isLoading || !dashboard.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[74px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const { current, live, cash } = dashboard.data;
  const canCreate = can("day:create");
  const canClose = can("day:close");

  // لا يوجد يوم مفتوح
  if (!current || !cash) {
    return (
      <>
        <EmptyState
          icon={CalendarPlus}
          title="لا يوجد يوم عمل مفتوح"
          description="افتح وردية جديدة لبدء تسجيل العمليات ومتابعة الصندوق والإيرادات لحظياً."
          action={
            canCreate ? (
              <Button onClick={() => setOpenDialog(true)}>
                <Plus aria-hidden />
                فتح يوم عمل
              </Button>
            ) : undefined
          }
        />
        <OpenDayDialog open={openDialog} onOpenChange={setOpenDialog} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* بطاقة الصندوق + الإجراءات */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              وردية يوم {current.businessDate}
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                مفتوح
              </span>
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              فُتح في {formatDateTime(current.openedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCreate && (
              <Button variant="outline" size="sm" onClick={() => setCashDialog(true)}>
                <Plus aria-hidden />
                حركة نقدية
              </Button>
            )}
            {canClose && (
              <Button size="sm" onClick={() => setCloseDialog(true)}>
                <DoorClosed aria-hidden />
                إغلاق اليوم
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
            <CashItem label="افتتاحي الصندوق" value={formatCurrency(cash.openingCash)} />
            <CashItem label="مبيعات نقدية" value={formatCurrency(cash.cashSales)} />
            <CashItem label="إيداعات" value={formatCurrency(cash.cashIn)} />
            <CashItem label="مسحوبات" value={formatCurrency(cash.cashOut)} />
            <CashItem
              label="المتوقع بالصندوق"
              value={formatCurrency(cash.expectedCash)}
              strong
            />
          </div>
        </CardContent>
      </Card>

      {/* اللقطة الحيّة */}
      {live && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lock className="size-4" aria-hidden />
            ملخص الوردية الحيّ (يُحدَّث عند كل عملية)
          </div>
          <SnapshotCards snapshot={live} />
        </div>
      )}

      <CashMovementDialog open={cashDialog} onOpenChange={setCashDialog} />
      <CloseDayDialog open={closeDialog} onOpenChange={setCloseDialog} cash={cash} />
    </div>
  );
}

function CashItem({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={strong ? "text-base font-bold tabular-nums" : "font-medium tabular-nums"}>
        {value}
      </p>
    </div>
  );
}
