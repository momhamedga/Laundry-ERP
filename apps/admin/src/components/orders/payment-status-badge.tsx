import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/types/orders";

const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; className: string }> = {
  UNPAID: { label: "غير مدفوع", className: "bg-destructive/10 text-destructive" },
  PARTIAL: { label: "مدفوع جزئياً", className: "bg-warning/15 text-warning-foreground dark:text-warning" },
  PAID: { label: "مدفوع بالكامل", className: "bg-success/15 text-success" },
  REFUNDED: { label: "مسترجع", className: "bg-muted text-muted-foreground" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS_META[status];
  return <Badge className={cn("border-transparent", meta.className)}>{meta.label}</Badge>;
}
