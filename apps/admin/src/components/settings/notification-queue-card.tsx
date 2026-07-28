"use client";

import { RotateCw, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useClearOldNotificationsMutation,
  useQueueStatusQuery,
  useRetryFailedDeliveriesMutation,
} from "@/hooks/use-notifications";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDateTime } from "@/lib/format";

const CLEANUP_OPTIONS = [7, 30, 60, 90] as const;

/** إحصاءات Outbox حقيقية من NotificationDelivery - notifications:manage (ADMIN) فقط */
export function NotificationQueueCard() {
  const { can } = usePermissions();
  const canManage = can("notifications:manage");
  const { data: queue, isLoading } = useQueueStatusQuery(canManage);
  const retryFailed = useRetryFailedDeliveriesMutation();
  const clearOld = useClearOldNotificationsMutation();

  const [days, setDays] = useState<string>("30");
  const [customDays, setCustomDays] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const effectiveDays = days === "custom" ? Number(customDays) : Number(days);
  const canCleanup = Number.isInteger(effectiveDays) && effectiveDays > 0;

  if (!canManage) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">حالة طابور التسليم (Outbox)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !queue ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <QueueStat label="قيد الانتظار" value={queue.pending} />
              <QueueStat label="تم الإرسال" value={queue.sent} tone="success" />
              <QueueStat label="فشل" value={queue.failed} tone="destructive" />
              <QueueStat label="تم تخطّيه" value={queue.skipped} />
              <QueueStat label="إعادة محاولة" value={queue.retries} />
            </div>
            <p className="text-xs text-muted-foreground">
              آخر معالجة: {queue.lastProcessingAt ? formatDateTime(queue.lastProcessingAt) : "لا يوجد بعد"}
            </p>
          </>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => retryFailed.mutate()}
            disabled={retryFailed.isPending || !queue || queue.failed === 0}
          >
            <RotateCw aria-hidden /> إعادة محاولة الفاشلة
          </Button>

          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={(v) => setDays(v ?? "30")}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLEANUP_OPTIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    أقدم من {d} يوماً
                  </SelectItem>
                ))}
                <SelectItem value="custom">تخصيص...</SelectItem>
              </SelectContent>
            </Select>
            {days === "custom" && (
              <Input
                type="number"
                min={1}
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="عدد الأيام"
                className="h-7 w-28"
              />
            )}
            <Button
              variant="destructive"
              size="sm"
              disabled={!canCleanup}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 aria-hidden /> حذف الإشعارات القديمة
            </Button>
          </div>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الإشعارات القديمة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف كل الإشعارات (لكل المستخدمين) الأقدم من {effectiveDays} يوماً نهائياً. هذا
              الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearOld.mutate(effectiveDays);
                setConfirmOpen(false);
              }}
            >
              حذف نهائياً
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function QueueStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "destructive";
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "success"
            ? "text-lg font-semibold text-success"
            : tone === "destructive"
              ? "text-lg font-semibold text-destructive"
              : "text-lg font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}
