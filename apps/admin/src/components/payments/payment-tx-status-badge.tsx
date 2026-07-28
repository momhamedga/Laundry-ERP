import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PaymentTxStatus } from "@/types/payment";

/** حالة الدفعة الواحدة - مختلفة عن OrderPaymentStatusBadge (حالة الطلب المشتقة) */
const STATUS_META: Record<PaymentTxStatus, { label: string; className: string }> = {
  PENDING: { label: "قيد الانتظار", className: "bg-warning/15 text-warning-foreground dark:text-warning" },
  COMPLETED: { label: "مكتملة", className: "bg-success/15 text-success" },
  FAILED: { label: "فشلت", className: "bg-destructive/10 text-destructive" },
  CANCELLED: { label: "ملغاة", className: "bg-muted text-muted-foreground" },
  REFUNDED: { label: "مستردة", className: "bg-accent text-accent-foreground" },
};

export function PaymentTxStatusBadge({ status }: { status: PaymentTxStatus }) {
  const meta = STATUS_META[status];
  return <Badge className={cn("border-transparent", meta.className)}>{meta.label}</Badge>;
}
