"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import type { Customer } from "@/types/customer";
import { CustomerCard } from "./customer-card";
import { CustomerLookup } from "./customer-lookup";

interface CustomerSelectionStepProps {
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
}

/**
 * الخطوة الأولى بمعالج إنشاء الطلب - اختيار العميل
 * Validation: لا انتقال للخطوة التالية إلا بعد اختيار عميل (يُطبَّق بالمعالج الأب)
 */
export function CustomerSelectionStep({
  selectedCustomer,
  onSelect,
}: CustomerSelectionStepProps) {
  const { can } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);

  if (selectedCustomer) {
    return (
      <div className="space-y-3">
        <CustomerCard customerId={selectedCustomer.id} />
        <Button variant="outline" size="sm" onClick={() => onSelect(null)}>
          تغيير العميل
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <CustomerLookup onSelect={onSelect} />

      {can("customers:manage") && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3">
          <p className="text-sm text-muted-foreground">لم تجد العميل؟</p>
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <UserPlus aria-hidden /> عميل جديد
          </Button>
        </div>
      )}

      <CreateCustomerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onSelect}
      />
    </div>
  );
}
