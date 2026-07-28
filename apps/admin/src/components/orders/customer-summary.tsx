import { User } from "lucide-react";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import type { Customer } from "@/types/customer";

/** ملخص مختصر للعميل المختار - يُعرض بأعلى الخطوات التالية بالمعالج */
export function CustomerSummary({ customer }: { customer: Customer }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
      <User className="size-4 text-muted-foreground" aria-hidden />
      <span className="font-medium">{customer.name}</span>
      <span dir="ltr" className="text-xs text-muted-foreground">
        {customer.phone}
      </span>
      <CustomerStatusBadge isActive={customer.isActive} />
    </div>
  );
}
