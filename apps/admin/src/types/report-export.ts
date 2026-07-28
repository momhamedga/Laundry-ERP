import type {
  BranchesReportParams,
  CustomersReportParams,
  EmployeesReportParams,
  OrdersReportParams,
  PaymentsReportParams,
  ReportTab,
  ServicesReportParams,
} from "@/types/report";

/**
 * أنواع تصدير التقارير - مطابقة حرفياً لمسارات /reports/export/* بالخادم
 * (apps/api/src/modules/reports/export.validator.ts). التصدير يقبل نفس فلاتر
 * كل تقرير تماماً؛ page/limit تُستبعَد (التصدير يُدفّق كل الصفوف المطابقة) لكن
 * تمريرها غير ضارّ (Zod يُسقِط المفاتيح الزائدة) - لذا نعيد استخدام أنواع
 * الفلاتر القائمة كما هي، بلا تعريف مُكرَّر.
 */

export type ExportFormat = "csv" | "excel" | "pdf" | "print";

// ==================== Phase 7: فلاتر تصدير تقارير المخزون ====================
export interface InventoryExportFilters {
  itemType?: "PRODUCT" | "RAW_MATERIAL";
  supplierId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
export interface MovementsExportFilters {
  itemId?: string;
  movementType?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
export interface SuppliersExportFilters {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
export interface PurchasesExportFilters {
  status?: string;
  supplierId?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
export interface StockValueExportFilters {
  itemType?: "PRODUCT" | "RAW_MATERIAL";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/** خرائط فلاتر التصدير لكل نوع تقرير - نفس فلاتر القراءة (بلا page/limit فعلياً) */
export interface ExportFiltersByType {
  orders: OrdersReportParams;
  payments: PaymentsReportParams;
  customers: CustomersReportParams;
  services: ServicesReportParams;
  branches: BranchesReportParams;
  employees: EmployeesReportParams;
  inventory: InventoryExportFilters;
  "inventory-movements": MovementsExportFilters;
  "inventory-suppliers": SuppliersExportFilters;
  "inventory-purchases": PurchasesExportFilters;
  "inventory-stock-value": StockValueExportFilters;
  // Phase 8: تقارير الباركود (بلا فلاتر)
  "barcode-most-scanned": Record<string, never>;
  "barcode-print-history": Record<string, never>;
  "barcode-missing": Record<string, never>;
  "barcode-invalid": Record<string, never>;
  "barcode-unused": Record<string, never>;
  // Phase 9: تقارير الولاء/الكوبونات/العضوية (بلا فلاتر)
  "loyalty-top-customers": Record<string, never>;
  "loyalty-points-balance": Record<string, never>;
  "loyalty-points-history": Record<string, never>;
  "loyalty-expired-points": Record<string, never>;
  "loyalty-referral": Record<string, never>;
  "coupon-usage": Record<string, never>;
  "coupon-performance": Record<string, never>;
  "membership-distribution": Record<string, never>;
  // Phase 9.5: تقرير إغلاق اليوم
  "day-closings": DayClosingsExportFilters;
  // Phase 9.6e: HR + Security/Audit
  attendance: AttendanceExportFilters;
  payroll: Record<string, never>;
  audit: AuditExportFilters;
  security: { from?: string; to?: string };
}

export interface DayClosingsExportFilters {
  status?: "OPEN" | "CLOSED" | "REOPENED";
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface AttendanceExportFilters {
  status?: "PRESENT" | "LATE" | "ABSENT" | "ON_LEAVE" | "HALF_DAY";
  from?: string;
  to?: string;
}

export interface AuditExportFilters {
  action?: string;
  from?: string;
  to?: string;
}

export type ExportReportType = ReportTab | keyof ExportFiltersByType;

/** فلاتر أي تقرير - Union لكل الأنواع */
export type AnyExportFilters = ExportFiltersByType[keyof ExportFiltersByType];
