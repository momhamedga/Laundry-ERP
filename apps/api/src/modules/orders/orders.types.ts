import type { Prisma } from "@prisma/client";

/** بيانات الترقيم الموحدة في meta */
export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ==================== Prisma Include Shapes ====================
// أشكال include ثابتة → أنواع مشتقة تلقائياً - لا N+1 (كل شيء join واحد)

export const ORDER_LIST_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  branch: { select: { id: true, name: true } },
  _count: { select: { items: true } },
} satisfies Prisma.OrderInclude;

export const ORDER_DETAIL_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  branch: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  items: {
    include: { service: { select: { id: true, name: true, unit: true } } },
  },
} satisfies Prisma.OrderInclude;

export const HISTORY_INCLUDE = {
  changedBy: { select: { id: true, name: true } },
} satisfies Prisma.OrderStatusHistoryInclude;

export type OrderListRow = Prisma.OrderGetPayload<{
  include: typeof ORDER_LIST_INCLUDE;
}>;

export type OrderDetail = Prisma.OrderGetPayload<{
  include: typeof ORDER_DETAIL_INCLUDE;
}>;

export type HistoryEntry = Prisma.OrderStatusHistoryGetPayload<{
  include: typeof HISTORY_INCLUDE;
}>;

export interface ListOrdersResult {
  orders: OrderListRow[];
  meta: PaginationMeta;
}

// ==================== Computation ====================

/** عنصر بعد التسعير من الخادم - unitPrice snapshot من الخدمة */
export interface PricedOrderItem {
  serviceId: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  discount: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  notes: string | null;
}

/** الإجماليات المحسوبة بالخادم فقط - Business Rule */
export interface OrderTotals {
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  total: Prisma.Decimal;
  items: PricedOrderItem[];
}
