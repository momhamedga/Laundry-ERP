// ==================== Pagination ====================

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ==================== Sorting (Whitelist صارمة لكل تقرير) ====================

export const ORDERS_REPORT_SORTABLE_FIELDS = ["receivedAt", "total", "orderNumber"] as const;
export type OrdersReportSortableField = (typeof ORDERS_REPORT_SORTABLE_FIELDS)[number];

export const PAYMENTS_REPORT_SORTABLE_FIELDS = ["createdAt", "amount"] as const;
export type PaymentsReportSortableField = (typeof PAYMENTS_REPORT_SORTABLE_FIELDS)[number];

export const CUSTOMERS_REPORT_SORTABLE_FIELDS = ["createdAt", "name"] as const;
export type CustomersReportSortableField = (typeof CUSTOMERS_REPORT_SORTABLE_FIELDS)[number];

/** يُطبَّق على قائمة الخدمات (Most Used / Revenue Per Service كلاهما نفس القائمة بترتيب مختلف) */
export const SERVICES_REPORT_SORTABLE_FIELDS = ["timesUsed", "totalRevenue", "totalQuantity"] as const;
export type ServicesReportSortableField = (typeof SERVICES_REPORT_SORTABLE_FIELDS)[number];

export const BRANCHES_REPORT_SORTABLE_FIELDS = ["revenue", "ordersCount", "customersCount"] as const;
export type BranchesReportSortableField = (typeof BRANCHES_REPORT_SORTABLE_FIELDS)[number];

export const EMPLOYEES_REPORT_SORTABLE_FIELDS = ["ordersCreatedCount", "paymentsProcessedAmount"] as const;
export type EmployeesReportSortableField = (typeof EMPLOYEES_REPORT_SORTABLE_FIELDS)[number];

// ==================== Phase 7: Inventory Reports ====================

export const INVENTORY_REPORT_SORTABLE_FIELDS = ["name", "quantity", "createdAt"] as const;
export const MOVEMENTS_REPORT_SORTABLE_FIELDS = ["createdAt", "quantity"] as const;
export const SUPPLIERS_REPORT_SORTABLE_FIELDS = ["name", "createdAt"] as const;
export const PURCHASES_REPORT_SORTABLE_FIELDS = ["createdAt", "total"] as const;
export const STOCK_VALUE_REPORT_SORTABLE_FIELDS = ["name", "quantity"] as const;

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

// ==================== Top Customers ====================

export const DEFAULT_TOP_CUSTOMERS_LIMIT = 10;
export const MAX_TOP_CUSTOMERS_LIMIT = 50;
