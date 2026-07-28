"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/format";
import type { OrderDetail } from "@/types/orders";

interface OrderSuccessStateProps {
  order: OrderDetail;
  /** مبلغ الدفعة المُسجَّلة فور الإنشاء إن وُجدت (اختياري بالمعالج) */
  paidAmount?: number;
  onClose: () => void;
}

/** حالة النجاح بعد إنشاء الطلب - رقم الطلب/اسم العميل/الإجمالي الكلي/الدفعة إن سُجِّلت */
export function OrderSuccessState({ order, paidAmount, onClose }: OrderSuccessStateProps) {
  return (
    <div className="contents">
      <div
        role="status"
        className="flex flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-4 py-10 text-center"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="size-8" aria-hidden />
        </span>
        <div>
          <p className="text-lg font-semibold">تم إنشاء الطلب بنجاح</p>
          <p dir="ltr" className="mt-1 text-sm text-muted-foreground">
            {order.orderNumber}
          </p>
        </div>
        <dl className="w-full max-w-xs space-y-1.5 rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">العميل</dt>
            <dd className="font-medium">{order.customer.name}</dd>
          </div>
          <div className="flex items-center justify-between border-t pt-1.5 font-semibold">
            <dt>الإجمالي الكلي</dt>
            <dd className="tabular-nums">{formatCurrency(order.total)}</dd>
          </div>
          {paidAmount !== undefined && (
            <div className="flex items-center justify-between text-success">
              <dt>دفعة مُسجَّلة</dt>
              <dd className="tabular-nums font-medium">{formatCurrency(paidAmount)}</dd>
            </div>
          )}
        </dl>
      </div>
      <SheetFooter className="border-t">
        <Button className="w-full" onClick={onClose} autoFocus>
          إغلاق
        </Button>
      </SheetFooter>
    </div>
  );
}
