import type { Order, OrderStatus, Payment, PaymentMethod, PaymentTxStatus } from "@prisma/client";

/** بيانات الترقيم الموحدة - نفس شكل كل وحدات المشروع */
export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ==================== 1) Orders Report ====================

export interface OrdersReportSummary {
  totalOrders: number;
  /** Σ(Order.total) للطلبات غير الملغاة فقط ضمن الفلاتر - راجع القرارات المعمارية بالتقرير */
  totalRevenue: number;
  /** totalRevenue / عدد الطلبات غير الملغاة - صفر إن لم يوجد طلب غير ملغى */
  averageOrderValue: number;
}

export interface OrdersReportResult {
  summary: OrdersReportSummary;
  orders: (Order & { customerName: string; branchName: string })[];
  meta: PaginationMeta;
}

// ==================== 2) Payments Report ====================

export interface PaymentsReportSummary {
  totalPayments: number;
  /** صافي المحصَّل (COMPLETED+REFUNDED): Σamount - ΣrefundedAmount */
  totalAmount: number;
  /** إجمالي المُسترَد (COMPLETED+REFUNDED) */
  refunded: number;
  /** إجمالي المعلَّق (PENDING) */
  pending: number;
}

export interface PaymentsReportResult {
  summary: PaymentsReportSummary;
  payments: (Payment & { orderNumber: string; branchName: string })[];
  meta: PaginationMeta;
}

// ==================== 3) Customers Report ====================

export interface CustomersReportSummary {
  /** إجمالي العملاء المسجَّلين بالنظام - رقم عام غير مُقيَّد بفرع (العميل غير مرتبط مباشرة بفرع) */
  totalCustomers: number;
  /** عملاء أُنشئوا ضمن from/to */
  newCustomers: number;
}

export interface TopCustomerRow {
  id: string;
  name: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
}

export interface CustomersReportRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
  ordersCount: number;
  totalSpent: number;
}

export interface CustomersReportResult {
  summary: CustomersReportSummary;
  topCustomers: TopCustomerRow[];
  customers: CustomersReportRow[];
  meta: PaginationMeta;
}

// ==================== 4) Services Report ====================

/** صف واحد يخدم "الأكثر استخداماً" و"الإيراد لكل خدمة" معاً - فرزهما مختلف فقط (sortBy) على نفس البيانات */
export interface ServiceUsageRow {
  id: string;
  name: string;
  categoryName: string;
  unit: string;
  isActive: boolean;
  timesUsed: number;
  totalQuantity: number;
  totalRevenue: number;
}

export interface ServicesReportResult {
  services: ServiceUsageRow[];
  meta: PaginationMeta;
}

// ==================== 5) Branches Report ====================

export interface BranchReportRow {
  id: string;
  name: string;
  isActive: boolean;
  revenue: number;
  ordersCount: number;
  customersCount: number;
  paymentsCount: number;
}

export interface BranchesReportResult {
  branches: BranchReportRow[];
  meta: PaginationMeta;
}

// ==================== 6) Employees Report ====================

export interface EmployeeReportRow {
  id: string;
  name: string;
  email: string;
  role: string;
  ordersCreatedCount: number;
  paymentsProcessedCount: number;
  paymentsProcessedAmount: number;
}

export interface EmployeesReportResult {
  employees: EmployeeReportRow[];
  meta: PaginationMeta;
}

// ==================== Re-exports مفيدة لطبقة Repository ====================

export type { Order, OrderStatus, Payment, PaymentMethod, PaymentTxStatus };
