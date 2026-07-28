"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useOrderDraftStore, type OrderDraftItem } from "@/store/order-draft-store";
import { DiscountInput } from "./discount-input";
import { QuantityInput } from "./quantity-input";
import { WeightInput } from "./weight-input";

interface SelectedItemRowProps {
  item: OrderDraftItem;
}

/** سطر ببند مختار - تعديل الكمية/الوزن والخصم حياً مع إجمالي السطر */
export function SelectedItemRow({ item }: SelectedItemRowProps) {
  const updateQuantity = useOrderDraftStore((s) => s.updateQuantity);
  const updateDiscount = useOrderDraftStore((s) => s.updateDiscount);
  const removeItem = useOrderDraftStore((s) => s.removeItem);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b py-3 last:border-b-0">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate font-medium">{item.service.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(item.service.price)}
          {item.service.unit === "KG" && " / كجم"}
        </p>
      </div>

      {item.service.unit === "PIECE" && (
        <QuantityInput
          value={item.quantity}
          onChange={(q) => updateQuantity(item.lineId, q)}
        />
      )}
      {item.service.unit === "KG" && (
        <WeightInput value={item.quantity} onChange={(q) => updateQuantity(item.lineId, q)} />
      )}

      <DiscountInput
        value={item.discount}
        max={item.grossAmount}
        onChange={(d) => updateDiscount(item.lineId, d)}
      />

      <span className="w-20 shrink-0 text-end font-semibold tabular-nums">
        {formatCurrency(item.lineTotal)}
      </span>

      <Button
        size="icon"
        variant="ghost"
        onClick={() => removeItem(item.lineId)}
        aria-label={`إزالة ${item.service.name}`}
      >
        <X aria-hidden />
      </Button>
    </div>
  );
}
