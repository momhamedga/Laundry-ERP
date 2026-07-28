import type { OrderStatus } from "@/types/orders";

export interface OrderStatusMeta {
  label: string;
  /** فئات Tailwind جاهزة (خلفية + نص) - نفس نمط شارات الحالة بالمشروع */
  className: string;
}

/**
 * المصدر الوحيد لتحويل حالة الطلب إلى Label/Color - يُستخدم في كل المشروع
 * (لوحة العميل، جدول الطلبات، تفاصيل الطلب...) بدل تكرار الخريطة بكل مكان
 */
export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  RECEIVED: { label: "مستلم", className: "bg-primary/10 text-primary" },
  INSPECTING: { label: "فحص", className: "bg-secondary text-secondary-foreground" },
  WASHING: {
    label: "غسيل",
    className: "bg-warning/15 text-warning-foreground dark:text-warning",
  },
  DRYING: {
    label: "تجفيف",
    className: "bg-warning/15 text-warning-foreground dark:text-warning",
  },
  IRONING: {
    label: "كي",
    className: "bg-warning/15 text-warning-foreground dark:text-warning",
  },
  PACKING: { label: "تغليف", className: "bg-accent text-accent-foreground" },
  READY: { label: "جاهز", className: "bg-success/15 text-success" },
  DELIVERED: { label: "تم التسليم", className: "bg-muted text-muted-foreground" },
  CANCELLED: { label: "ملغي", className: "bg-destructive/10 text-destructive" },
};

export function getOrderStatusMeta(status: OrderStatus): OrderStatusMeta {
  return ORDER_STATUS_META[status];
}

/** يطابق ORDER_STATUS_FLOW بـ apps/api/.../orders.constants.ts حرفياً - CANCELLED له مسار منفصل */
export const ORDER_STATUS_FLOW: readonly OrderStatus[] = [
  "RECEIVED",
  "INSPECTING",
  "WASHING",
  "DRYING",
  "IRONING",
  "PACKING",
  "READY",
  "DELIVERED",
];

export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = ["DELIVERED", "CANCELLED"];

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.includes(status);
}

/**
 * الحالات المسموح الانتقال إليها من الحالة الحالية - تقدّم للأمام فقط
 * (مرآة لـ canTransition بالخادم، مصدر الحقيقة يبقى الخادم دائماً)
 */
export function getNextStatusOptions(current: OrderStatus): OrderStatus[] {
  if (isTerminalOrderStatus(current)) return [];
  const currentIndex = ORDER_STATUS_FLOW.indexOf(current);
  if (currentIndex === -1) return [];
  return ORDER_STATUS_FLOW.slice(currentIndex + 1);
}
