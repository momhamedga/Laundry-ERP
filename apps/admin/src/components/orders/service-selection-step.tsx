"use client";

import { useOrderDraftStore } from "@/store/order-draft-store";
import type { Service } from "@/types/service";
import { DraftOrderSummary } from "./draft-order-summary";
import { SelectedItemsTable } from "./selected-items-table";
import { ServiceLookup } from "./service-lookup";

/**
 * الخطوة الثانية بمعالج إنشاء الطلب - اختيار الخدمات
 * Validation: تعطيل "التالي" حتى تحتوي القائمة المختارة على بند واحد على الأقل
 * (يُطبَّق بالمعالج الأب عبر items.length بالمتجر)
 */
export function ServiceSelectionStep() {
  const items = useOrderDraftStore((s) => s.items);
  const addItem = useOrderDraftStore((s) => s.addItem);

  return (
    <div className="space-y-4">
      <ServiceLookup onAdd={(service: Service) => addItem(service)} />

      <div className="space-y-2">
        <h3 className="text-sm font-medium">الخدمات المختارة ({items.length})</h3>
        <SelectedItemsTable />
      </div>

      {items.length > 0 && <DraftOrderSummary />}
    </div>
  );
}
