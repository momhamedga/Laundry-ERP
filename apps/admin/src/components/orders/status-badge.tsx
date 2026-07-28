import { Badge } from "@/components/ui/badge";
import { getOrderStatusMeta } from "@/lib/order-status";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/orders";

/**
 * الشارة الوحيدة لحالة الطلب بكل المشروع - تعتمد على lib/order-status.ts
 * (يستخدمها كل من صفحة العميل وقائمة/تفاصيل الطلبات)
 */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = getOrderStatusMeta(status);
  return <Badge className={cn("border-transparent", meta.className)}>{meta.label}</Badge>;
}
