"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useChangeOrderStatusMutation } from "@/hooks/use-orders";
import { getNextStatusOptions, getOrderStatusMeta } from "@/lib/order-status";
import type { OrderDetail, OrderStatus } from "@/types/orders";

interface UpdateStatusDialogProps {
  order: OrderDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * تحديث حالة الطلب - تقدّم للأمام فقط ضمن خط السير (RECEIVED→...→DELIVERED)
 * القفز فوق مراحل مسموح، الرجوع ممنوع - يُطابق canTransition بالخادم
 */
export function UpdateStatusDialog({ order, open, onOpenChange }: UpdateStatusDialogProps) {
  const mutation = useChangeOrderStatusMutation(order?.id ?? "");
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [notes, setNotes] = useState("");

  const nextOptions = order ? getNextStatusOptions(order.status) : [];

  function handleOpenChange(next: boolean) {
    if (next) {
      setStatus(null);
      setNotes("");
    }
    onOpenChange(next);
  }

  async function handleConfirm() {
    if (!order || !status) return;
    try {
      await mutation.mutateAsync({ status, notes: notes.trim() === "" ? null : notes.trim() });
      handleOpenChange(false);
    } catch {
      // toast بالفعل عبر onError - يبقى الحوار مفتوحاً لإعادة المحاولة
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تحديث حالة الطلب</DialogTitle>
          <DialogDescription dir="ltr">{order?.orderNumber}</DialogDescription>
        </DialogHeader>

        {nextOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لا توجد حالة تالية متاحة - الطلب في حالة نهائية.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="update-status-select">الحالة الجديدة *</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus((v as OrderStatus) ?? null)}
                items={Object.fromEntries(nextOptions.map((s) => [s, getOrderStatusMeta(s).label]))}
              >
                <SelectTrigger id="update-status-select" className="w-full">
                  <SelectValue placeholder="اختر الحالة التالية" />
                </SelectTrigger>
                <SelectContent>
                  {nextOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {getOrderStatusMeta(s).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="update-status-notes">ملاحظات (اختياري)</Label>
              <Textarea
                id="update-status-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={() => void handleConfirm()}
            disabled={!status || mutation.isPending || nextOptions.length === 0}
          >
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            تحديث الحالة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
