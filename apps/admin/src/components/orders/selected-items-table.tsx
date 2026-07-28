"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingCart } from "lucide-react";
import { useOrderDraftStore } from "@/store/order-draft-store";
import { SelectedItemRow } from "./selected-item-row";

/** جدول البنود المختارة بمسودة الطلب - حي بالكامل من المتجر */
export function SelectedItemsTable() {
  const items = useOrderDraftStore((s) => s.items);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="لم تُضف أي خدمة بعد"
        description="اختر خدمة من القائمة أعلاه لإضافتها للطلب"
      />
    );
  }

  return (
    <div role="table" aria-label="الخدمات المختارة" className="rounded-lg border px-3">
      {items.map((item) => (
        <SelectedItemRow key={item.lineId} item={item} />
      ))}
    </div>
  );
}
