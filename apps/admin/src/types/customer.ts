import type { PaginationMeta, SortOrder } from "@/types";

export type CustomerSortField = "createdAt" | "name" | "phone";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** تُحسب من قاعدة البيانات مباشرة بالخادم عند كل طلب */
export interface CustomerStats {
  totalOrders: number;
  activeOrders: number;
  totalSpent: number;
  totalPaid: number;
  balanceDue: number;
  lastOrderAt: string | null;
}

export type RecentOrderStatus =
  | "RECEIVED"
  | "INSPECTING"
  | "WASHING"
  | "DRYING"
  | "IRONING"
  | "PACKING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export type RecentOrderPaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "REFUNDED";

/** ملخص طلب - المبالغ Decimal تصل كنص من الخادم (Prisma.Decimal.toJSON) */
export interface RecentOrder {
  id: string;
  orderNumber: string;
  status: RecentOrderStatus;
  paymentStatus: RecentOrderPaymentStatus;
  total: string;
  paidAmount: string;
  receivedAt: string;
  dueDate: string | null;
}

export interface CustomerProfile {
  customer: Customer;
  recentOrders: RecentOrder[];
  stats: CustomerStats;
}

export interface ListCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  /** yyyy-mm-dd */
  createdFrom?: string;
  createdTo?: string;
  sortBy?: CustomerSortField;
  sortOrder?: SortOrder;
}

export interface ListCustomersResult {
  customers: Customer[];
  meta: PaginationMeta;
}

/** الحقول المشتركة بين Create وUpdate بعد تحويل الحقول الفارغة إلى null */
export interface CustomerMutationInput {
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
}
