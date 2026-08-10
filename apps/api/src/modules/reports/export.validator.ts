import { OrderStatus, PaymentMethod, PaymentTxStatus } from "@prisma/client";
import { z } from "zod";
import {
  BRANCHES_REPORT_SORTABLE_FIELDS,
  CUSTOMERS_REPORT_SORTABLE_FIELDS,
  DEFAULT_TOP_CUSTOMERS_LIMIT,
  EMPLOYEES_REPORT_SORTABLE_FIELDS,
  MAX_TOP_CUSTOMERS_LIMIT,
  ORDERS_REPORT_SORTABLE_FIELDS,
  PAYMENTS_REPORT_SORTABLE_FIELDS,
  SERVICES_REPORT_SORTABLE_FIELDS,
  SORT_ORDERS,
} from "./reports.constants.js";

/**
 * تحقّق التصدير - يُعيد استخدام نفس enums/constants الحقيقية المُستخدَمة بقراءة
 * التقارير (reports.validator.ts) حرفياً؛ الفرق الوحيد عن reports.validator.ts:
 * `type` مُميِّز إلزامي (Union واحد يخدم 4 مسارات تصدير بدل مسار لكل تقرير)،
 * وبلا page/limit (التصدير يجلب/يُدفّق كل الصفوف المطابقة للفلاتر - لا ترقيم صفحات).
 * منطق الفلترة/التجميع نفسه يبقى بالكامل داخل ReportsRepository (صفر تكرار).
 */

const dateRangeShape = {
  from: z.coerce.date("Invalid from date").optional(),
  to: z.coerce.date("Invalid to date").optional(),
};

function refineDateRange(d: unknown): boolean {
  const range = d as { from?: Date; to?: Date };
  if (range.from === undefined || range.to === undefined) return true;
  return range.from.getTime() <= range.to.getTime();
}

export const exportQuerySchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("orders"),
      ...dateRangeShape,
      branchId: z.string().trim().min(1).optional(),
      customerId: z.cuid("Invalid customer id").optional(),
      status: z.enum(OrderStatus).optional(),
      sortBy: z.enum(ORDERS_REPORT_SORTABLE_FIELDS).default("receivedAt"),
      sortOrder: z.enum(SORT_ORDERS).default("desc"),
    }),
    z.object({
      type: z.literal("payments"),
      ...dateRangeShape,
      branchId: z.string().trim().min(1).optional(),
      method: z.enum(PaymentMethod).optional(),
      status: z.enum(PaymentTxStatus).optional(),
      sortBy: z.enum(PAYMENTS_REPORT_SORTABLE_FIELDS).default("createdAt"),
      sortOrder: z.enum(SORT_ORDERS).default("desc"),
    }),
    z.object({
      type: z.literal("customers"),
      ...dateRangeShape,
      branchId: z.string().trim().min(1).optional(),
      topLimit: z.coerce.number().int().min(1).max(MAX_TOP_CUSTOMERS_LIMIT).default(DEFAULT_TOP_CUSTOMERS_LIMIT),
      sortBy: z.enum(CUSTOMERS_REPORT_SORTABLE_FIELDS).default("createdAt"),
      sortOrder: z.enum(SORT_ORDERS).default("desc"),
    }),
    z.object({
      type: z.literal("services"),
      ...dateRangeShape,
      branchId: z.string().trim().min(1).optional(),
      sortBy: z.enum(SERVICES_REPORT_SORTABLE_FIELDS).default("timesUsed"),
      sortOrder: z.enum(SORT_ORDERS).default("desc"),
    }),
    z.object({
      type: z.literal("branches"),
      ...dateRangeShape,
      sortBy: z.enum(BRANCHES_REPORT_SORTABLE_FIELDS).default("revenue"),
      sortOrder: z.enum(SORT_ORDERS).default("desc"),
    }),
    z.object({
      type: z.literal("employees"),
      ...dateRangeShape,
      branchId: z.string().trim().min(1).optional(),
      sortBy: z.enum(EMPLOYEES_REPORT_SORTABLE_FIELDS).default("ordersCreatedCount"),
      sortOrder: z.enum(SORT_ORDERS).default("desc"),
    }),
    // ==================== Phase 7: تقارير المخزون ====================
    z.object({
      type: z.literal("inventory"),
      itemType: z.enum(["PRODUCT", "RAW_MATERIAL"]).optional(),
      supplierId: z.cuid().optional(),
      sortBy: z.enum(["name", "quantity", "createdAt"]).default("name"),
      sortOrder: z.enum(SORT_ORDERS).default("asc"),
    }),
    z.object({
      type: z.literal("inventory-movements"),
      ...dateRangeShape,
      itemId: z.cuid().optional(),
      movementType: z
        .enum(["IN", "OUT", "RETURN", "ADJUSTMENT", "LOSS", "TRANSFER", "OPENING", "CLOSING"])
        .optional(),
      sortBy: z.enum(["createdAt", "quantity"]).default("createdAt"),
      sortOrder: z.enum(SORT_ORDERS).default("desc"),
    }),
    z.object({
      type: z.literal("inventory-suppliers"),
      sortBy: z.enum(["name", "createdAt"]).default("name"),
      sortOrder: z.enum(SORT_ORDERS).default("asc"),
    }),
    z.object({
      type: z.literal("inventory-purchases"),
      ...dateRangeShape,
      status: z.enum(["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"]).optional(),
      supplierId: z.cuid().optional(),
      sortBy: z.enum(["createdAt", "total"]).default("createdAt"),
      sortOrder: z.enum(SORT_ORDERS).default("desc"),
    }),
    z.object({
      type: z.literal("inventory-stock-value"),
      itemType: z.enum(["PRODUCT", "RAW_MATERIAL"]).optional(),
      sortBy: z.enum(["name", "quantity"]).default("quantity"),
      sortOrder: z.enum(SORT_ORDERS).default("desc"),
    }),
    // ==================== Phase 8: تقارير الباركود ====================
    z.object({ type: z.literal("barcode-most-scanned") }),
    z.object({ type: z.literal("barcode-print-history") }),
    z.object({ type: z.literal("barcode-missing") }),
    z.object({ type: z.literal("barcode-invalid") }),
    z.object({ type: z.literal("barcode-unused") }),
    // ==================== Phase 9: تقارير الولاء/الكوبونات/العضوية ====================
    z.object({ type: z.literal("loyalty-top-customers") }),
    z.object({ type: z.literal("loyalty-points-balance") }),
    z.object({ type: z.literal("loyalty-points-history") }),
    z.object({ type: z.literal("loyalty-expired-points") }),
    z.object({ type: z.literal("loyalty-referral") }),
    z.object({ type: z.literal("coupon-usage") }),
    z.object({ type: z.literal("coupon-performance") }),
    z.object({ type: z.literal("membership-distribution") }),
    // ==================== Phase 9.5: تقرير إغلاق اليوم ====================
    z.object({
      type: z.literal("day-closings"),
      ...dateRangeShape,
      status: z.enum(["OPEN", "CLOSED", "REOPENED"]).optional(),
      sortBy: z.enum(["businessDate"]).default("businessDate"),
      sortOrder: z.enum(SORT_ORDERS).default("desc"),
    }),
    // ==================== Phase 9.6e: HR + Security/Audit ====================
    z.object({
      type: z.literal("attendance"),
      ...dateRangeShape,
      status: z.enum(["PRESENT", "LATE", "ABSENT", "ON_LEAVE", "HALF_DAY"]).optional(),
    }),
    z.object({ type: z.literal("payroll") }),
    z.object({
      type: z.literal("audit"),
      ...dateRangeShape,
      action: z.string().trim().max(60).optional(),
    }),
    z.object({
      type: z.literal("security"),
      ...dateRangeShape,
    }),
  ])
  .refine(refineDateRange, { message: "تاريخ البداية يجب ألا يتجاوز تاريخ النهاية.", path: ["to"] });

export type ExportQuery = z.infer<typeof exportQuerySchema>;
export type ExportReportType = ExportQuery["type"];
