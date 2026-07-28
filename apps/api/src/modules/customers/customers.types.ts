import type { Customer, Order } from "@prisma/client";

/** بيانات الترقيم الموحدة في meta */
export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ListCustomersResult {
  customers: Customer[];
  meta: PaginationMeta;
}

/**
 * إحصائيات العميل - تُحسب من قاعدة البيانات مباشرة عند الطلب
 * (المبالغ لا تشمل الطلبات الملغاة)
 */
export interface CustomerStats {
  /** إجمالي الطلبات (كل الحالات) */
  totalOrders: number;
  /** الطلبات النشطة: مستلمة / جاري التنفيذ / جاهزة */
  activeOrders: number;
  /** إجمالي قيمة الطلبات */
  totalSpent: number;
  /** إجمالي المدفوع */
  totalPaid: number;
  /** الرصيد المستحق = الإجمالي - المدفوع */
  balanceDue: number;
  /** تاريخ آخر طلب */
  lastOrderAt: Date | null;
}

/** ملخص طلب في قائمة آخر الطلبات */
export type RecentOrder = Pick<
  Order,
  | "id"
  | "orderNumber"
  | "status"
  | "paymentStatus"
  | "total"
  | "paidAmount"
  | "receivedAt"
  | "dueDate"
>;

/** Customer Profile الكامل */
export interface CustomerProfile {
  customer: Customer;
  recentOrders: RecentOrder[];
  stats: CustomerStats;
}
