import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/types/invoice";

const STATUS_META: Record<InvoiceStatus, { label: string; className: string }> = {
  DRAFT: { label: "مسودة", className: "bg-muted text-muted-foreground" },
  ISSUED: { label: "صادرة", className: "bg-primary/10 text-primary" },
  PARTIALLY_PAID: { label: "مدفوعة جزئياً", className: "bg-warning/15 text-warning-foreground dark:text-warning" },
  PAID: { label: "مدفوعة بالكامل", className: "bg-success/15 text-success" },
  CANCELLED: { label: "ملغاة", className: "bg-destructive/10 text-destructive" },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const meta = STATUS_META[status];
  return <Badge className={cn("border-transparent", meta.className)}>{meta.label}</Badge>;
}
