import type { PaginationMeta, SortOrder, UserRole } from "@/types";
import type { OrderStatus, PaymentStatus as OrderPaymentStatus } from "@/types/orders";
import type { PaymentMethod, PaymentTxStatus } from "@/types/payment";
import type { ServiceUnit } from "@/types/service";

/**
 * أنواع تقارير Reports API - مطابقة حرفياً لـ apps/api/src/modules/reports/
 * (reports.types.ts + reports.dto.ts + reports.validator.ts + reports.constants.ts)
 * راجع الخادم دائماً قبل أي تعديل هنا - لا حقول/فلاتر مُختلَقة
 */

export type ReportTab = "orders" | "payments" | "customers" | "services" | "branches" | "employees";

// ==================== Sort Fields (Whitelist مطابقة لـ reports.constants.ts) ====================

export type OrdersReportSortField = "receivedAt" | "total" | "orderNumber";
export type PaymentsReportSortField = "createdAt" | "amount";
export type CustomersReportSortField = "createdAt" | "name";
export type ServicesReportSortField = "timesUsed" | "totalRevenue" | "totalQuantity";
export type BranchesReportSortField = "revenue" | "ordersCount" | "customersCount";
export type EmployeesReportSortField = "ordersCreatedCount" | "paymentsProcessedAmount";

// ==================== 1) Orders Report ====================

export interface OrdersReportSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

/** صف طلب بالتقرير - حقول Order الخام (Decimal كنص) + customerName/branchName المُسطَّحة من الخادم */
export interface OrdersReportRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
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
  customer: { name: string };
  branch: { name: string };
  customerName: string;
  branchName: string;
}

export interface OrdersReportParams {
  from?: string;
  to?: string;
  branchId?: string;
  customerId?: string;
  status?: OrderStatus;
  page?: number;
  limit?: number;
  sortBy?: OrdersReportSortField;
  sortOrder?: SortOrder;
}

export interface OrdersReportResult {
  summary: OrdersReportSummary;
  orders: OrdersReportRow[];
  meta: PaginationMeta;
}

// ==================== 2) Payments Report ====================

export interface PaymentsReportSummary {
  totalPayments: number;
  totalAmount: number;
  refunded: number;
  pending: number;
}

export interface PaymentsReportRow {
  id: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentTxStatus;
  refundedAmount: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  orderId: string;
  receivedById: string;
  order: { orderNumber: string; branch: { name: string } };
  orderNumber: string;
  branchName: string;
}

export interface PaymentsReportParams {
  from?: string;
  to?: string;
  branchId?: string;
  method?: PaymentMethod;
  status?: PaymentTxStatus;
  page?: number;
  limit?: number;
  sortBy?: PaymentsReportSortField;
  sortOrder?: SortOrder;
}

export interface PaymentsReportResult {
  summary: PaymentsReportSummary;
  payments: PaymentsReportRow[];
  meta: PaginationMeta;
}

// ==================== 3) Customers Report ====================

export interface CustomersReportSummary {
  totalCustomers: number;
  newCustomers: number;
}

export interface TopCustomerRow {
  id: string;
  name: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
}

/** عملاء لهم نشاط (طلب واحد فأكثر) ضمن الفلاتر فقط - وليس كل العملاء بلا قيد (راجع customersListWithActivity بالخادم) */
export interface CustomersReportRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ordersCount: number;
  totalSpent: number;
}

export interface CustomersReportParams {
  from?: string;
  to?: string;
  branchId?: string;
  /** أعلى N عميل بقائمة topCustomers - 1 إلى 50، افتراضي 10 (راجع reports.constants.ts) */
  topLimit?: number;
  page?: number;
  limit?: number;
  sortBy?: CustomersReportSortField;
  sortOrder?: SortOrder;
}

export interface CustomersReportResult {
  summary: CustomersReportSummary;
  topCustomers: TopCustomerRow[];
  customers: CustomersReportRow[];
  meta: PaginationMeta;
}

// ==================== 4) Services Report ====================

/** صف واحد يخدم "الأكثر استخداماً" و"الإيراد لكل خدمة" معاً - sortBy فقط يغيّر الترتيب (لا Endpoint منفصل) */
export interface ServiceUsageRow {
  id: string;
  name: string;
  categoryName: string;
  unit: ServiceUnit;
  isActive: boolean;
  timesUsed: number;
  totalQuantity: number;
  totalRevenue: number;
}

export interface ServicesReportParams {
  from?: string;
  to?: string;
  branchId?: string;
  page?: number;
  limit?: number;
  sortBy?: ServicesReportSortField;
  sortOrder?: SortOrder;
}

/** لا summary بهذا التقرير بالخادم - services + meta فقط */
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

/** لا فلتر branchId بهذا التقرير عمداً بالخادم (مقارنة بين الفروع نفسها) - لا from/to فقط */
export interface BranchesReportParams {
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sortBy?: BranchesReportSortField;
  sortOrder?: SortOrder;
}

/** لا summary بهذا التقرير بالخادم - branches + meta فقط */
export interface BranchesReportResult {
  branches: BranchReportRow[];
  meta: PaginationMeta;
}

// ==================== 6) Employees Report ====================

export interface EmployeeReportRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ordersCreatedCount: number;
  paymentsProcessedCount: number;
  paymentsProcessedAmount: number;
}

export interface EmployeesReportParams {
  from?: string;
  to?: string;
  branchId?: string;
  page?: number;
  limit?: number;
  sortBy?: EmployeesReportSortField;
  sortOrder?: SortOrder;
}

/** لا summary بهذا التقرير بالخادم - employees + meta فقط */
export interface EmployeesReportResult {
  employees: EmployeeReportRow[];
  meta: PaginationMeta;
}
