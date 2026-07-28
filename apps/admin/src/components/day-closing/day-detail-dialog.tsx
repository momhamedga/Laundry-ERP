"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DayClosingView } from "@/types/day-closing";
import { DAY_STATUS_BADGE, DAY_STATUS_LABELS } from "./day-format";
import { SnapshotCards } from "./snapshot-cards";

interface Props {
  day: DayClosingView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DayDetailDialog({ day, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            تفاصيل يوم {day?.businessDate}
            {day && <Badge variant={DAY_STATUS_BADGE[day.status]}>{DAY_STATUS_LABELS[day.status]}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {day && (
          <div className="space-y-5">
            {/* الصندوق */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-muted/40 p-4 text-sm sm:grid-cols-3">
              <Field label="افتتاحي الصندوق" value={formatCurrency(day.openingCash)} />
              <Field label="إيداعات" value={formatCurrency(day.cashIn)} />
              <Field label="مسحوبات" value={formatCurrency(day.cashOut)} />
              <Field label="المتوقع" value={formatCurrency(day.expectedCash)} />
              <Field
                label="الفعلي"
                value={day.actualCash === null ? "—" : formatCurrency(day.actualCash)}
              />
              <Field
                label="الفرق"
                value={day.cashDifference === null ? "—" : formatCurrency(day.cashDifference)}
                className={cn(
                  day.cashDifference !== null && day.cashDifference > 0 && "text-success",
                  day.cashDifference !== null && day.cashDifference < 0 && "text-destructive",
                )}
              />
            </div>

            {day.differenceNote && (
              <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
                <span className="font-medium">سبب الفرق: </span>
                {day.differenceNote}
              </p>
            )}

            {/* سير العمل */}
            <div className="grid grid-cols-1 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
              <span>فُتح: {formatDateTime(day.openedAt)}</span>
              {day.closedAt && <span>أُغلق: {formatDateTime(day.closedAt)}</span>}
              {day.reopenedAt && <span>أُعيد فتحه: {formatDateTime(day.reopenedAt)}</span>}
              {day.approvedAt && <span>اعتُمد: {formatDateTime(day.approvedAt)}</span>}
            </div>

            {day.reopenReason && (
              <p className="text-sm">
                <span className="font-medium">سبب إعادة الفتح: </span>
                {day.reopenReason}
              </p>
            )}

            {/* اللقطة */}
            {day.snapshot ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">ملخص اليوم المحاسبي</p>
                <SnapshotCards snapshot={day.snapshot} />
              </div>
            ) : (
              <DialogDescription>لا توجد لقطة محاسبية (اليوم لم يُغلق بعد).</DialogDescription>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-medium tabular-nums", className)}>{value}</p>
    </div>
  );
}
