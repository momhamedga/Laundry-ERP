import type { ListOrdersParams } from "@/types/orders";
import type { ListBranchesParams } from "@/types/branch";
import type { ListInvoicePaymentsParams, ListInvoicesParams } from "@/types/invoice";
import type { ListNotificationsParams } from "@/types/notification";
import type { BackupHistoryParams } from "@/types/backup";
import type { ListExpensesParams, OperatingSummaryParams } from "@/types/expenses";
import type {
  ListItemsParams,
  ListMovementsParams,
  ListPurchasesParams,
  ListSuppliersParams,
} from "@/types/inventory";
import type {
  BranchesReportParams,
  CustomersReportParams,
  EmployeesReportParams,
  OrdersReportParams,
  PaymentsReportParams,
  ServicesReportParams,
} from "@/types/report";

/**
 * مفاتيح React Query مركزية - لا نصوص خام متفرقة بالمشروع
 * (وحدات سابقة عرّفت مفاتيحها محلياً داخل ملفات الـ hooks؛ هذا الملف
 * هو النمط الموصى به للوحدات الجديدة، بدءاً من Orders)
 */
export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (params: ListOrdersParams) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  history: (id: string) => [...orderKeys.all, "history", id] as const,
};

/** فروع - lists() الأصلي لفلتر الفرع الخفيف؛ list(params)/detail(id) لصفحة إدارة الفروع الكاملة */
export const branchKeys = {
  all: ["branches"] as const,
  lists: () => [...branchKeys.all, "list"] as const,
  list: (params: ListBranchesParams) => [...branchKeys.lists(), params] as const,
  details: () => [...branchKeys.all, "detail"] as const,
  detail: (id: string) => [...branchKeys.details(), id] as const,
};

/** عملاء - بحث خفيف لتعبئة فلتر العميل داخل الطلبات */
export const customerLookupKeys = {
  search: (query: string) => ["customers", "lookup", query] as const,
};

/** فواتير */
export const invoiceKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  list: (params: ListInvoicesParams) => [...invoiceKeys.lists(), params] as const,
  details: () => [...invoiceKeys.all, "detail"] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
  payments: (id: string, params: ListInvoicePaymentsParams) =>
    [...invoiceKeys.detail(id), "payments", params] as const,
};

/** إشعارات */
export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (params: ListNotificationsParams) => [...notificationKeys.lists(), params] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
  preferences: () => [...notificationKeys.all, "preferences"] as const,
  // Phase 4D
  channelSettings: () => [...notificationKeys.all, "channel-settings"] as const,
  providerStatus: () => [...notificationKeys.all, "provider-status"] as const,
  queueStatus: () => [...notificationKeys.all, "queue-status"] as const,
  statistics: () => [...notificationKeys.all, "statistics"] as const,
};

/** النسخ الاحتياطي (Phase 6) */
export const backupKeys = {
  all: ["backup"] as const,
  history: (params: BackupHistoryParams) => [...backupKeys.all, "history", params] as const,
  statistics: () => [...backupKeys.all, "statistics"] as const,
  health: () => [...backupKeys.all, "health"] as const,
  settings: () => [...backupKeys.all, "settings"] as const,
};

/** المخزون (Phase 7) */
export const inventoryKeys = {
  all: ["inventory"] as const,
  items: (params: ListItemsParams) => [...inventoryKeys.all, "items", params] as const,
  item: (id: string) => [...inventoryKeys.all, "item", id] as const,
  stats: () => [...inventoryKeys.all, "stats"] as const,
  movements: (params: ListMovementsParams) => [...inventoryKeys.all, "movements", params] as const,
  alerts: (params: { page?: number; limit?: number; status?: string; type?: string }) =>
    [...inventoryKeys.all, "alerts", params] as const,
};

export const supplierKeys = {
  all: ["suppliers"] as const,
  list: (params: ListSuppliersParams) => [...supplierKeys.all, "list", params] as const,
  detail: (id: string) => [...supplierKeys.all, "detail", id] as const,
  stats: (id: string) => [...supplierKeys.all, "stats", id] as const,
};

export const purchaseKeys = {
  all: ["purchases"] as const,
  list: (params: ListPurchasesParams) => [...purchaseKeys.all, "list", params] as const,
  detail: (id: string) => [...purchaseKeys.all, "detail", id] as const,
};

export const expenseKeys = {
  all: ["expenses"] as const,
  list: (params: ListExpensesParams) => [...expenseKeys.all, "list", params] as const,
  detail: (id: string) => [...expenseKeys.all, "detail", id] as const,
  summary: (params: OperatingSummaryParams) => [...expenseKeys.all, "summary", params] as const,
};

/** الولاء/الكوبونات/العضوية (Phase 9) */
export const loyaltyKeys = {
  all: ["loyalty"] as const,
  accounts: (params: object) => [...loyaltyKeys.all, "accounts", params] as const,
  summary: (id: string) => [...loyaltyKeys.all, "summary", id] as const,
  history: (params: object) => [...loyaltyKeys.all, "history", params] as const,
  stats: () => [...loyaltyKeys.all, "stats"] as const,
  settings: () => [...loyaltyKeys.all, "settings"] as const,
  campaigns: (params: object) => [...loyaltyKeys.all, "campaigns", params] as const,
};
export const couponKeys = {
  all: ["coupons"] as const,
  list: (params: object) => [...couponKeys.all, "list", params] as const,
  stats: () => [...couponKeys.all, "stats"] as const,
};
export const membershipKeys = {
  all: ["membership"] as const,
  tiers: () => [...membershipKeys.all, "tiers"] as const,
  distribution: () => [...membershipKeys.all, "distribution"] as const,
};

/** الباركود (Phase 8) */
export const barcodeKeys = {
  all: ["barcode"] as const,
  stats: () => [...barcodeKeys.all, "stats"] as const,
  templates: (params: { page?: number; limit?: number; search?: string }) =>
    [...barcodeKeys.all, "templates", params] as const,
  printHistory: (params: { page?: number; limit?: number; itemId?: string }) =>
    [...barcodeKeys.all, "print-history", params] as const,
  scanHistory: (params: { page?: number; limit?: number }) =>
    [...barcodeKeys.all, "scan-history", params] as const,
};

/** إغلاق اليوم المحاسبي (Phase 9.5) */
export const dayClosingKeys = {
  all: ["day-closing"] as const,
  dashboard: () => [...dayClosingKeys.all, "dashboard"] as const,
  current: () => [...dayClosingKeys.all, "current"] as const,
  preClose: () => [...dayClosingKeys.all, "pre-close"] as const,
  history: (params: object) => [...dayClosingKeys.all, "history", params] as const,
  detail: (id: string) => [...dayClosingKeys.all, "detail", id] as const,
};

/** الموارد البشرية (Phase 9.6b) */
export const hrKeys = {
  all: ["hr"] as const,
  attendance: (params: object) => [...hrKeys.all, "attendance", params] as const,
  leaves: (params: object) => [...hrKeys.all, "leaves", params] as const,
  leaveBalances: (employeeProfileId: string) => [...hrKeys.all, "leave-balances", employeeProfileId] as const,
  payrollRuns: (params: object) => [...hrKeys.all, "payroll", params] as const,
  payrollRun: (id: string) => [...hrKeys.all, "payroll-run", id] as const,
  salaryComponents: (employeeProfileId: string) => [...hrKeys.all, "components", employeeProfileId] as const,
  documents: (employeeProfileId: string) => [...hrKeys.all, "documents", employeeProfileId] as const,
  expiringDocuments: (withinDays: number) => [...hrKeys.all, "expiring-docs", withinDays] as const,
};

/** الإدارة/الأمان (Phase 9.5) */
export const adminKeys = {
  all: ["admin"] as const,
  securityCenter: () => [...adminKeys.all, "security-center"] as const,
  permissionMatrix: () => [...adminKeys.all, "permissions-matrix"] as const,
  loginHistory: (params: object) => [...adminKeys.all, "login-history", params] as const,
  userSessions: (userId: string) => [...adminKeys.all, "sessions", userId] as const,
};

/** الموظفون (Phase 9.5) */
export const employeeKeys = {
  all: ["employees"] as const,
  list: (params: object) => [...employeeKeys.all, "list", params] as const,
  stats: () => [...employeeKeys.all, "stats"] as const,
  detail: (id: string) => [...employeeKeys.all, "detail", id] as const,
};

/** تقارير - قراءة فقط، مفتاح مستقل لكل تقرير من الستة */
export const reportKeys = {
  all: ["reports"] as const,
  orders: (params: OrdersReportParams) => [...reportKeys.all, "orders", params] as const,
  payments: (params: PaymentsReportParams) => [...reportKeys.all, "payments", params] as const,
  customers: (params: CustomersReportParams) => [...reportKeys.all, "customers", params] as const,
  services: (params: ServicesReportParams) => [...reportKeys.all, "services", params] as const,
  branches: (params: BranchesReportParams) => [...reportKeys.all, "branches", params] as const,
  employees: (params: EmployeesReportParams) => [...reportKeys.all, "employees", params] as const,
};
