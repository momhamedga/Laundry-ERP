import type { PaginationMeta, SortOrder } from "@/types";

export type OrderStatus =
  | "RECEIVED"
  | "INSPECTING"
  | "WASHING"
  | "DRYING"
  | "IRONING"
  | "PACKING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "REFUNDED";

export type OrderSortField = "receivedAt" | "dueDate" | "total" | "orderNumber" | "createdAt";

export type ServiceUnit = "PIECE" | "KG" | "FIXED";

export interface OrderCustomerSummary {
  id: string;
  name: string;
  phone: string;
}

export interface OrderBranchSummary {
  id: string;
  name: string;
}

export interface OrderCreatedBySummary {
  id: string;
  name: string;
}

export interface OrderServiceSummary {
  id: string;
  name: string;
  unit: ServiceUnit;
}

/**
 * صف الطلب في القائمة - GET /orders
 * ملاحظة: لا يحتوي createdBy (غير مضمّن بالخادم في القائمة، فقط بالتفاصيل)
 * المبالغ Decimal تصل كنص من الخادم (Prisma.Decimal.toJSON)
 */
export interface OrderListRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: string;
  discount: string;
  total: string;
  paidAmount: string;
  notes: string | null;
  receivedAt: string;
  dueDate: string;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  branchId: string;
  createdById: string;
  customer: OrderCustomerSummary;
  branch: OrderBranchSummary;
  _count: { items: number };
}

/** بند من بنود الطلب - جزء من تفاصيل الطلب فقط */
export interface OrderItem {
  id: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  subtotal: string;
  notes: string | null;
  orderId: string;
  serviceId: string;
  service: OrderServiceSummary;
}

/** تفاصيل الطلب الكاملة - GET /orders/:id */
export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: string;
  discount: string;
  total: string;
  paidAmount: string;
  notes: string | null;
  receivedAt: string;
  dueDate: string;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  branchId: string;
  createdById: string;
  customer: OrderCustomerSummary;
  branch: OrderBranchSummary;
  createdBy: OrderCreatedBySummary;
  items: OrderItem[];
}

/** سجل تغيير حالة - GET /orders/:id/history */
export interface OrderHistoryEntry {
  id: string;
  oldStatus: OrderStatus | null;
  newStatus: OrderStatus;
  notes: string | null;
  createdAt: string;
  orderId: string;
  changedById: string;
  changedBy: OrderCreatedBySummary;
}

export interface ListOrdersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  branchId?: string;
  /** yyyy-mm-dd */
  receivedFrom?: string;
  receivedTo?: string;
  /** نطاق تاريخ الاستحقاق (yyyy-mm-dd أو ISO) - تصفية على الخادم لشاشة التسليمات */
  dueFrom?: string;
  dueTo?: string;
  sortBy?: OrderSortField;
  sortOrder?: SortOrder;
}

export interface ListOrdersResult {
  orders: OrderListRow[];
  meta: PaginationMeta;
}

/**
 * ملخص فرع - لتعبئة فلتر الفرع فقط (GET /branches موجود بالخادم مسبقاً،
 * لم يُستهلك من الواجهة قبل الآن - لا Endpoint جديد)
 */
export interface Branch {
  id: string;
  name: string;
  isActive: boolean;
}

/** بند بطلب الإنشاء - السعر يُقرأ من الخدمة بالخادم، لا يُرسل من العميل */
export interface CreateOrderItemInput {
  serviceId: string;
  quantity: number;
  discount: number;
}

/**
 * Payload لـ POST /orders - branchId اختياري (يُشتق من actor.branchId بالخادم
 * عند غيابه)؛ يُرسَل فقط عندما لا يملك المستخدم فرعاً مُعيَّناً ويوجد فرع نشط
 * واحد لا لبس فيه - راجع ReviewStep
 */
export interface CreateOrderInput {
  customerId: string;
  branchId?: string;
  receivedAt: string;
  dueDate: string;
  /** خصم إضافي على مستوى الطلب كله - فوق خصومات البنود الفردية */
  discount?: number;
  notes: string | null;
  items: CreateOrderItemInput[];
}

/**
 * Payload لـ PATCH /orders/:id - كل الحقول اختيارية (Partial بالخادم)
 * هذه المرحلة تحرر dueDate/discount/notes فقط - بلا تعديل بنود الطلب
 * (items) بقرار معماري صريح لتفادي إعادة بناء منطق المعالج بالكامل
 */
export interface UpdateOrderInput {
  dueDate?: string;
  discount?: number;
  notes?: string | null;
}

export interface ChangeOrderStatusInput {
  status: OrderStatus;
  notes?: string | null;
}

export interface CancelOrderInput {
  notes?: string | null;
}
