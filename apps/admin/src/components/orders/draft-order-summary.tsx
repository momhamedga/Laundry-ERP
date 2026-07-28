"use client";

import { formatCurrency } from "@/lib/format";
import { selectOrderDraftTotals, useOrderDraftStore } from "@/store/order-draft-store";

/**
 * ملخص مسودة الطلب الحي (Subtotal/Discount/Grand Total) - مشتق من المتجر.
 * ملاحظة: لا علاقة له بـ OrderSummaryCard الخاص بتفاصيل طلب موجود بالفعل.
 */
export function DraftOrderSummary() {
  const items = useOrderDraftStore((s) => s.items);
  const { subtotal, discountTotal, grandTotal } = selectOrderDraftTotals(items);

  return (
    <dl className="space-y-1.5 rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">الإجمالي الفرعي</dt>
        <dd className="tabular-nums">{formatCurrency(subtotal)}</dd>
      </div>
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">إجمالي الخصم</dt>
        <dd className="tabular-nums text-destructive">
          {discountTotal > 0 ? `− ${formatCurrency(discountTotal)}` : formatCurrency(0)}
        </dd>
      </div>
      <div className="flex items-center justify-between border-t pt-1.5 font-semibold">
        <dt>الإجمالي الكلي</dt>
        <dd className="tabular-nums">{formatCurrency(grandTotal)}</dd>
      </div>
    </dl>
  );
}
