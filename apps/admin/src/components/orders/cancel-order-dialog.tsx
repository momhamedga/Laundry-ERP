"use client";

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
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCancelOrderMutation } from "@/hooks/use-orders";
import type { OrderDetail } from "@/types/orders";

interface CancelOrderDialogProps {
  order: OrderDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** إلغاء الطلب - مسار منفصل عن تحديث الحالة، مرفوض بعد DELIVERED/CANCELLED */
export function CancelOrderDialog({ order, open, onOpenChange }: CancelOrderDialogProps) {
  const mutation = useCancelOrderMutation(order?.id ?? "");
  const [reason, setReason] = useState("");

  function handleOpenChange(next: boolean) {
    if (next) setReason("");
    onOpenChange(next);
  }

  async function handleConfirm() {
    if (!order) return;
    try {
      await mutation.mutateAsync({ notes: reason.trim() === "" ? null : reason.trim() });
      handleOpenChange(false);
    } catch {
      // toast بالفعل عبر onError - يبقى الحوار مفتوحاً لإعادة المحاولة
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>إلغاء الطلب؟</AlertDialogTitle>
          <AlertDialogDescription dir="ltr">{order?.orderNumber}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="cancel-order-reason">سبب الإلغاء (اختياري)</Label>
          <Textarea
            id="cancel-order-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>تراجع</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner className="text-destructive" />}
            إلغاء الطلب
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
