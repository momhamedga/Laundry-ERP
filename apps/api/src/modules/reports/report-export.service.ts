import { Prisma } from "@prisma/client";
import type { AuditAction, OrderStatus, PaymentMethod, PaymentTxStatus, UserRole } from "@prisma/client";
import type { Response } from "express";
import ExcelJS from "exceljs";
import { isValidBarcodeValue } from "../barcode/barcode.codec.js";
import type { ExportQuery } from "./export.validator.js";
import type { ReportsRepository } from "./reports.repository.js";
import type { ReportColumn, ReportTotal } from "./report.template.js";

/**
 * محرّك التصدير - يُعيد استخدام ReportsRepository الحالي بالكامل (نفس Query
 * Builder/الفلاتر لكل تقرير) - صفر تكرار لمنطق الجلب/التجميع. الجديد هنا فقط:
 * (1) تعريف الأعمدة/التسميات العربية للعرض، (2) تدفّق الصفوف بدفعات (Batching)
 * بدل تحميل كل شيء بالذاكرة دفعة واحدة (Memory/Streaming - أساسي لمجموعات
 * البيانات الكبيرة 10000+)، (3) كتابة CSV/Excel مباشرة لتدفّق الاستجابة.
 */

// ==================== ثوابت ====================

/** حجم الدفعة عند التدفّق من قاعدة البيانات - يُحدّد الذاكرة القصوى المُستهلَكة لحظياً، لا الحجم الكلي */
const BATCH_SIZE = 1000;

/** حدّ أقصى لعدد الصفوف المُصدَّرة إجمالاً (كل الصيغ) - حماية أساسية ضد استعلام بلا حدود */
export const MAX_EXPORT_ROWS = 50_000;

/** حدّ أقصى أشد صرامة لـPDF/Print تحديداً - المستند بالكامل يُبنى بالذاكرة دفعة واحدة (قيد Puppeteer الحقيقي - راجع القيود بالتقرير) */
export const MAX_DOCUMENT_EXPORT_ROWS = 3_000;

const CURRENCY_SUFFIX = "ج.م";

// ==================== تسميات عربية محلية (بنفس نمط باقي وحدات المستندات بالمشروع) ====================

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: "مستلم",
  INSPECTING: "فحص",
  WASHING: "غسيل",
  DRYING: "تجفيف",
  IRONING: "كي",
  PACKING: "تغليف",
  READY: "جاهز",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي",
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "نقدي",
  CARD: "بطاقة",
  BANK_TRANSFER: "تحويل بنكي",
  MOBILE_WALLET: "محفظة إلكترونية",
};

const PAYMENT_STATUS_LABELS: Record<PaymentTxStatus, string> = {
  PENDING: "قيد الانتظار",
  COMPLETED: "مكتملة",
  FAILED: "فشلت",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
};

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "مدير النظام",
  MANAGER: "مدير فرع",
  CASHIER: "كاشير",
  WORKER: "عامل",
  DELIVERY: "مندوب توصيل",
};

const REPORT_TITLES: Record<ExportQuery["type"], string> = {
  orders: "تقرير الطلبات",
  payments: "تقرير المدفوعات",
  customers: "تقرير العملاء",
  services: "تقرير الخدمات",
  branches: "تقرير الفروع",
  employees: "تقرير الموظفين",
  inventory: "تقرير المخزون",
  "inventory-movements": "تقرير حركات المخزون",
  "inventory-suppliers": "تقرير الموردين",
  "inventory-purchases": "تقرير المشتريات",
  "inventory-stock-value": "تقرير قيمة المخزون",
  "barcode-most-scanned": "تقرير الأكثر مسحاً",
  "barcode-print-history": "تقرير سجل الطباعة",
  "barcode-missing": "تقرير الأصناف بلا باركود",
  "barcode-invalid": "تقرير الباركود غير الصالح",
  "barcode-unused": "تقرير الباركود غير المستخدم",
  "loyalty-top-customers": "تقرير أفضل العملاء",
  "loyalty-points-balance": "تقرير أرصدة النقاط",
  "loyalty-points-history": "تقرير سجل النقاط",
  "loyalty-expired-points": "تقرير النقاط المنتهية",
  "loyalty-referral": "تقرير الإحالات",
  "coupon-usage": "تقرير استخدام الكوبونات",
  "coupon-performance": "تقرير أداء الكوبونات",
  "membership-distribution": "تقرير توزيع العضوية",
  "day-closings": "تقرير إغلاق اليوم",
  attendance: "تقرير الحضور",
  payroll: "تقرير الرواتب",
  audit: "تقرير التدقيق",
  security: "تقرير الأمان",
};

const DAY_STATUS_LABELS: Record<string, string> = {
  OPEN: "مفتوح",
  CLOSED: "مُغلق",
  REOPENED: "أُعيد فتحه",
};

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: "حاضر",
  LATE: "متأخر",
  ABSENT: "غائب",
  ON_LEAVE: "في إجازة",
  HALF_DAY: "نصف يوم",
};

const AUDIT_ACTION_AR: Record<string, string> = {
  LOGIN_SUCCESS: "دخول ناجح",
  LOGIN_FAILED: "دخول فاشل",
  LOGOUT: "خروج",
  ACCOUNT_LOCKED: "قفل حساب",
  PASSWORD_CHANGED: "تغيير كلمة المرور",
  SESSION_REVOKED: "إنهاء جلسة",
  USER_FORCE_LOGOUT: "إخراج قسري",
  USER_IMPERSONATED: "انتحال",
  USER_PERMISSION_OVERRIDE: "تجاوز صلاحية",
};

/** أحداث الأمان لتقرير security (مجموعة فرعية من التدقيق) */
const SECURITY_AUDIT_ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGOUT",
  "ACCOUNT_LOCKED",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "SESSION_REVOKED",
  "TOKEN_REUSE_DETECTED",
  "USER_FORCE_LOGOUT",
  "USER_IMPERSONATED",
  "USER_PERMISSION_OVERRIDE",
] as const;

function minutesLabel(m: number): string {
  if (!m) return "—";
  return `${Math.floor(m / 60)}س ${m % 60}د`;
}

const LOYALTY_TX_LABELS: Record<string, string> = {
  EARN: "كسب",
  REDEEM: "استبدال",
  REVERSE: "عكس",
  EXPIRE: "انتهاء",
  ADJUST: "تسوية",
  BONUS: "مكافأة",
  WELCOME: "ترحيب",
  BIRTHDAY: "ميلاد",
  REFERRAL: "إحالة",
};

const LABEL_SIZE_LABELS: Record<string, string> = {
  A4: "A4",
  THERMAL_58: "حراري 58مم",
  THERMAL_80: "حراري 80مم",
  CUSTOM: "مخصّص",
};

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  IN: "إدخال",
  OUT: "إخراج",
  RETURN: "مرتجع",
  ADJUSTMENT: "تسوية",
  LOSS: "هالك",
  TRANSFER: "تحويل",
  OPENING: "افتتاحي",
  CLOSING: "ختامي",
};

const PURCHASE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "مسودة",
  ORDERED: "مطلوب",
  RECEIVED: "مستلم",
  CANCELLED: "ملغي",
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  PRODUCT: "منتج",
  RAW_MATERIAL: "مادة خام",
};

function formatMoney(value: Prisma.Decimal | number): string {
  const n = typeof value === "number" ? value : Number(value);
  return `${n.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${CURRENCY_SUFFIX}`;
}

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ==================== تعريف الأعمدة لكل تقرير ====================

const COLUMNS: Record<ExportQuery["type"], ReportColumn[]> = {
  orders: [
    { key: "orderNumber", label: "رقم الطلب" },
    { key: "customerName", label: "العميل" },
    { key: "branchName", label: "الفرع" },
    { key: "status", label: "الحالة" },
    { key: "total", label: "الإجمالي", align: "end" },
    { key: "paidAmount", label: "المدفوع", align: "end" },
    { key: "receivedAt", label: "تاريخ الاستلام" },
    { key: "deliveredAt", label: "تاريخ التسليم" },
  ],
  payments: [
    { key: "orderNumber", label: "رقم الطلب" },
    { key: "branchName", label: "الفرع" },
    { key: "amount", label: "المبلغ", align: "end" },
    { key: "method", label: "الطريقة" },
    { key: "status", label: "الحالة" },
    { key: "refundedAmount", label: "المسترد", align: "end" },
    { key: "reference", label: "المرجع" },
    { key: "createdAt", label: "التاريخ" },
  ],
  customers: [
    { key: "name", label: "الاسم" },
    { key: "phone", label: "الهاتف" },
    { key: "email", label: "البريد الإلكتروني" },
    { key: "ordersCount", label: "عدد الطلبات", align: "end" },
    { key: "totalSpent", label: "إجمالي الإنفاق", align: "end" },
    { key: "isActive", label: "نشط" },
    { key: "createdAt", label: "تاريخ التسجيل" },
  ],
  services: [
    { key: "name", label: "الخدمة" },
    { key: "categoryName", label: "التصنيف" },
    { key: "unit", label: "الوحدة" },
    { key: "timesUsed", label: "عدد الاستخدامات", align: "end" },
    { key: "totalQuantity", label: "إجمالي الكمية", align: "end" },
    { key: "totalRevenue", label: "الإيراد", align: "end" },
    { key: "isActive", label: "نشطة" },
  ],
  branches: [
    { key: "name", label: "الفرع" },
    { key: "revenue", label: "الإيراد", align: "end" },
    { key: "ordersCount", label: "عدد الطلبات", align: "end" },
    { key: "customersCount", label: "عدد العملاء", align: "end" },
    { key: "paymentsCount", label: "عدد الدفعات", align: "end" },
    { key: "isActive", label: "نشط" },
  ],
  employees: [
    { key: "name", label: "الاسم" },
    { key: "email", label: "البريد الإلكتروني" },
    { key: "role", label: "الدور" },
    { key: "ordersCreatedCount", label: "طلبات أُنشئت", align: "end" },
    { key: "paymentsProcessedCount", label: "دفعات عولجت", align: "end" },
    { key: "paymentsProcessedAmount", label: "قيمة الدفعات", align: "end" },
  ],
  inventory: [
    { key: "sku", label: "SKU" },
    { key: "name", label: "الصنف" },
    { key: "type", label: "النوع" },
    { key: "unit", label: "الوحدة" },
    { key: "supplierName", label: "المورّد" },
    { key: "quantity", label: "الرصيد", align: "end" },
    { key: "reorderLevel", label: "حد الطلب", align: "end" },
    { key: "costPrice", label: "التكلفة", align: "end" },
    { key: "stockValue", label: "قيمة المخزون", align: "end" },
    { key: "isActive", label: "نشط" },
  ],
  "inventory-movements": [
    { key: "sku", label: "SKU" },
    { key: "itemName", label: "الصنف" },
    { key: "type", label: "النوع" },
    { key: "quantity", label: "الكمية", align: "end" },
    { key: "beforeQuantity", label: "قبل", align: "end" },
    { key: "afterQuantity", label: "بعد", align: "end" },
    { key: "reference", label: "المرجع" },
    { key: "createdAt", label: "التاريخ" },
  ],
  "inventory-suppliers": [
    { key: "name", label: "المورّد" },
    { key: "contactName", label: "المسؤول" },
    { key: "phone", label: "الهاتف" },
    { key: "purchasesCount", label: "عدد المشتريات", align: "end" },
    { key: "totalSpent", label: "إجمالي الإنفاق", align: "end" },
    { key: "isActive", label: "نشط" },
  ],
  "inventory-purchases": [
    { key: "purchaseNumber", label: "رقم الشراء" },
    { key: "supplierName", label: "المورّد" },
    { key: "status", label: "الحالة" },
    { key: "itemsCount", label: "عدد البنود", align: "end" },
    { key: "subtotal", label: "الإجمالي الفرعي", align: "end" },
    { key: "tax", label: "الضريبة", align: "end" },
    { key: "total", label: "الإجمالي", align: "end" },
    { key: "createdAt", label: "التاريخ" },
  ],
  "inventory-stock-value": [
    { key: "sku", label: "SKU" },
    { key: "name", label: "الصنف" },
    { key: "type", label: "النوع" },
    { key: "quantity", label: "الرصيد", align: "end" },
    { key: "costPrice", label: "التكلفة", align: "end" },
    { key: "stockValue", label: "القيمة", align: "end" },
  ],
  "barcode-most-scanned": [
    { key: "sku", label: "SKU" },
    { key: "name", label: "الصنف" },
    { key: "barcode", label: "الباركود" },
    { key: "scanCount", label: "عدد المسح", align: "end" },
  ],
  "barcode-print-history": [
    { key: "sku", label: "SKU" },
    { key: "itemName", label: "الصنف" },
    { key: "size", label: "المقاس" },
    { key: "quantity", label: "عدد الملصقات", align: "end" },
    { key: "templateName", label: "القالب" },
    { key: "createdAt", label: "التاريخ" },
  ],
  "barcode-missing": [
    { key: "sku", label: "SKU" },
    { key: "name", label: "الصنف" },
    { key: "type", label: "النوع" },
    { key: "quantity", label: "الرصيد", align: "end" },
  ],
  "barcode-invalid": [
    { key: "sku", label: "SKU" },
    { key: "name", label: "الصنف" },
    { key: "barcode", label: "الباركود" },
    { key: "barcodeType", label: "النوع" },
  ],
  "barcode-unused": [
    { key: "sku", label: "SKU" },
    { key: "name", label: "الصنف" },
    { key: "barcode", label: "الباركود" },
    { key: "barcodeType", label: "النوع" },
  ],
  "loyalty-top-customers": [
    { key: "name", label: "العميل" },
    { key: "phone", label: "الهاتف" },
    { key: "level", label: "المستوى" },
    { key: "currentPoints", label: "النقاط الحالية", align: "end" },
    { key: "lifetimePoints", label: "نقاط العمر", align: "end" },
  ],
  "loyalty-points-balance": [
    { key: "name", label: "العميل" },
    { key: "level", label: "المستوى" },
    { key: "currentPoints", label: "الحالية", align: "end" },
    { key: "lifetimePoints", label: "العمر", align: "end" },
    { key: "redeemedPoints", label: "المستبدلة", align: "end" },
    { key: "expiredPoints", label: "المنتهية", align: "end" },
  ],
  "loyalty-points-history": [
    { key: "customerName", label: "العميل" },
    { key: "type", label: "النوع" },
    { key: "points", label: "النقاط", align: "end" },
    { key: "balanceAfter", label: "الرصيد بعد", align: "end" },
    { key: "reference", label: "المرجع" },
    { key: "createdAt", label: "التاريخ" },
  ],
  "loyalty-expired-points": [
    { key: "customerName", label: "العميل" },
    { key: "points", label: "النقاط", align: "end" },
    { key: "reference", label: "المرجع" },
    { key: "createdAt", label: "التاريخ" },
  ],
  "loyalty-referral": [
    { key: "customerName", label: "العميل" },
    { key: "points", label: "النقاط", align: "end" },
    { key: "createdAt", label: "التاريخ" },
  ],
  "coupon-usage": [
    { key: "code", label: "الكود" },
    { key: "type", label: "النوع" },
    { key: "customerName", label: "العميل" },
    { key: "discountAmount", label: "الخصم", align: "end" },
    { key: "createdAt", label: "التاريخ" },
  ],
  "coupon-performance": [
    { key: "code", label: "الكود" },
    { key: "type", label: "النوع" },
    { key: "redemptions", label: "مرات الاستخدام", align: "end" },
    { key: "totalDiscount", label: "إجمالي الخصم", align: "end" },
    { key: "isActive", label: "نشط" },
  ],
  "membership-distribution": [
    { key: "level", label: "المستوى" },
    { key: "count", label: "عدد الأعضاء", align: "end" },
    { key: "totalLifetimePoints", label: "إجمالي نقاط العمر", align: "end" },
  ],
  "day-closings": [
    { key: "businessDate", label: "التاريخ" },
    { key: "status", label: "الحالة" },
    { key: "openingCash", label: "افتتاحي الصندوق", align: "end" },
    { key: "totalRevenue", label: "إجمالي الإيراد", align: "end" },
    { key: "expectedCash", label: "المتوقع", align: "end" },
    { key: "actualCash", label: "الفعلي", align: "end" },
    { key: "cashDifference", label: "الفرق", align: "end" },
    { key: "closedAt", label: "وقت الإغلاق" },
  ],
  attendance: [
    { key: "employeeName", label: "الموظف" },
    { key: "workDate", label: "التاريخ" },
    { key: "clockIn", label: "الحضور" },
    { key: "clockOut", label: "الانصراف" },
    { key: "worked", label: "ساعات العمل", align: "end" },
    { key: "late", label: "التأخير", align: "end" },
    { key: "overtime", label: "الإضافي", align: "end" },
    { key: "status", label: "الحالة" },
  ],
  payroll: [
    { key: "employeeName", label: "الموظف" },
    { key: "period", label: "الفترة" },
    { key: "baseSalary", label: "الأساسي", align: "end" },
    { key: "allowances", label: "بدلات", align: "end" },
    { key: "bonuses", label: "مكافآت", align: "end" },
    { key: "overtimePay", label: "أجر إضافي", align: "end" },
    { key: "deductions", label: "خصومات", align: "end" },
    { key: "netSalary", label: "الصافي", align: "end" },
  ],
  audit: [
    { key: "action", label: "الحدث" },
    { key: "actor", label: "الفاعل" },
    { key: "email", label: "البريد" },
    { key: "ipAddress", label: "IP" },
    { key: "createdAt", label: "الوقت" },
  ],
  security: [
    { key: "action", label: "الحدث" },
    { key: "actor", label: "الفاعل" },
    { key: "email", label: "البريد" },
    { key: "ipAddress", label: "IP" },
    { key: "createdAt", label: "الوقت" },
  ],
};

export function getReportTitle(type: ExportQuery["type"]): string {
  return REPORT_TITLES[type];
}

export function getReportColumns(type: ExportQuery["type"]): ReportColumn[] {
  return COLUMNS[type];
}

/** أسطر وصفية جاهزة للعرض - نفس الفلاتر المُطبَّقة فعلياً بالاستعلام، بلا أي قيمة مُختلَقة */
export function buildFilterLines(query: ExportQuery): string[] {
  const lines: string[] = [];
  if ("from" in query && query.from) lines.push(`من: ${formatDate(query.from)}`);
  if ("to" in query && query.to) lines.push(`إلى: ${formatDate(query.to)}`);
  if ("branchId" in query && query.branchId) lines.push(`الفرع: ${query.branchId}`);
  if ("customerId" in query && query.customerId) lines.push(`العميل: ${query.customerId}`);
  if ("status" in query && query.status) {
    const label =
      query.type === "orders"
        ? ORDER_STATUS_LABELS[query.status as OrderStatus]
        : query.type === "day-closings"
          ? (DAY_STATUS_LABELS[query.status as string] ?? String(query.status))
          : query.type === "attendance"
            ? (ATTENDANCE_STATUS_LABELS[query.status as string] ?? String(query.status))
            : PAYMENT_STATUS_LABELS[query.status as PaymentTxStatus];
    lines.push(`الحالة: ${label}`);
  }
  if ("method" in query && query.method) lines.push(`طريقة الدفع: ${PAYMENT_METHOD_LABELS[query.method]}`);
  return lines;
}

/**
 * page/limit مطلوبان بتوقيع أنواع استعلام Repository الحالية (ordersReportQuerySchema
 * إلخ) لكن غير مُستخدَمين فعلياً بجسم الدوال - skip/take المُمرَّران منفصلين هما مصدر
 * الحقيقة الفعلي للتصفّح. قيمتان وهميتان هنا فقط لإرضاء التوقيع بلا تعديل Repository.
 */
function withPagination<T extends object>(query: T, limit: number): T & { page: number; limit: number } {
  return { ...query, page: 1, limit };
}

export class ReportExportService {
  constructor(private readonly repository: ReportsRepository) {}

  // ==================== Totals (يُعاد استخدام ملخصات Repository الحقيقية حيث تتوفر) ====================

  async getTotals(query: ExportQuery): Promise<ReportTotal[]> {
    switch (query.type) {
      case "orders": {
        const s = await this.repository.ordersSummary(withPagination(query, 1));
        const revenue = Number(s.totalRevenue);
        return [
          { label: "إجمالي عدد الطلبات", value: String(s.totalOrders) },
          { label: "إجمالي الإيراد", value: formatMoney(revenue) },
          {
            label: "متوسط قيمة الطلب",
            value: formatMoney(s.nonCancelledCount > 0 ? revenue / s.nonCancelledCount : 0),
          },
        ];
      }
      case "payments": {
        const s = await this.repository.paymentsSummary(withPagination(query, 1));
        return [
          { label: "إجمالي عدد الدفعات", value: String(s.totalPayments) },
          { label: "صافي المحصَّل", value: formatMoney(s.totalAmount) },
          { label: "إجمالي المسترد", value: formatMoney(s.refunded) },
          { label: "إجمالي المعلَّق", value: formatMoney(s.pending) },
        ];
      }
      case "customers": {
        const s = await this.repository.customersSummary(withPagination(query, 1));
        return [
          { label: "إجمالي العملاء", value: String(s.totalCustomers) },
          { label: "عملاء جدد بالفترة", value: String(s.newCustomers) },
        ];
      }
      case "inventory": {
        const s = await this.repository.inventoryReportSummary({
          type: query.itemType,
          supplierId: query.supplierId,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        });
        return [
          { label: "إجمالي الأصناف", value: String(s.totalItems) },
          { label: "إجمالي الكميات", value: Number(s.totalQuantity).toLocaleString("ar-EG") },
        ];
      }
      case "inventory-purchases": {
        const s = await this.repository.purchasesReportSummary({
          status: query.status,
          supplierId: query.supplierId,
          from: query.from,
          to: query.to,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        });
        return [
          { label: "إجمالي المشتريات", value: String(s.totalPurchases) },
          { label: "إجمالي القيمة", value: formatMoney(s.totalAmount) },
          { label: "إجمالي الضريبة", value: formatMoney(s.totalTax) },
        ];
      }
      case "inventory-stock-value": {
        const s = await this.repository.stockValueReportSummary({
          type: query.itemType,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        });
        return [
          { label: "إجمالي قيمة المخزون", value: formatMoney(s.totalValue) },
          { label: "إجمالي الكميات", value: s.totalQuantity.toLocaleString("ar-EG") },
        ];
      }
      // services/branches/employees/inventory-movements/inventory-suppliers: لا ملخص منفصل
      default:
        return [];
    }
  }

  // ==================== تدفّق الصفوف بدفعات (Streaming) ====================

  /**
   * مولِّد غير متزامن يُصدِر دفعات صفوف جاهزة للعرض (نصوص مُنسَّقة) - يستدعي
   * نفس دوال Repository الحقيقية (xxxList/xxxUsage) بحلقة skip/take، فيُطابق
   * تماماً بيانات نفس التقرير بواجهة القراءة. orders/payments/customers/services
   * تدفّق حقيقي من قاعدة البيانات دفعة دفعة (Memory-bounded). branches/employees
   * تُجمَّع بالذاكرة أصلاً داخل Repository نفسه (تصميم قائم مسبقاً - أعداد الفروع/
   * الموظفين صغيرة ببنية العمل الطبيعية) فتُجلَب مرة واحدة، يُوثَّق هذا صراحة بالتقرير.
   */
  async *streamRows(
    query: ExportQuery,
  ): AsyncGenerator<{ rows: Record<string, string>[]; runningTotals?: Map<string, number> }> {
    let skip = 0;
    let fetched = 0;

    if (query.type === "orders") {
      for (;;) {
        const { rows, total } = await this.repository.ordersList(withPagination(query, BATCH_SIZE), skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((o) => ({
            orderNumber: o.orderNumber,
            customerName: o.customer.name,
            branchName: o.branch.name,
            status: ORDER_STATUS_LABELS[o.status],
            total: formatMoney(o.total),
            paidAmount: formatMoney(o.paidAmount),
            receivedAt: formatDate(o.receivedAt),
            deliveredAt: formatDate(o.deliveredAt),
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "payments") {
      for (;;) {
        const { rows, total } = await this.repository.paymentsList(withPagination(query, BATCH_SIZE), skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((p) => ({
            orderNumber: p.order.orderNumber,
            branchName: p.order.branch.name,
            amount: formatMoney(p.amount),
            method: PAYMENT_METHOD_LABELS[p.method],
            status: PAYMENT_STATUS_LABELS[p.status],
            refundedAmount: formatMoney(p.refundedAmount),
            reference: p.reference ?? "—",
            createdAt: formatDate(p.createdAt),
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "customers") {
      for (;;) {
        const { rows, total } = await this.repository.customersListWithActivity(withPagination(query, BATCH_SIZE), skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((c) => ({
            name: c.name,
            phone: c.phone,
            email: c.email ?? "—",
            ordersCount: String(c.ordersCount),
            totalSpent: formatMoney(c.totalSpent),
            isActive: c.isActive ? "نعم" : "لا",
            createdAt: formatDate(c.createdAt),
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "services") {
      for (;;) {
        const { rows, total } = await this.repository.servicesUsage(withPagination(query, BATCH_SIZE), skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((s) => ({
            name: s.name,
            categoryName: s.categoryName,
            unit: s.unit,
            timesUsed: String(s.timesUsed),
            totalQuantity: Number(s.totalQuantity).toLocaleString("ar-EG"),
            totalRevenue: formatMoney(s.totalRevenue),
            isActive: s.isActive ? "نعم" : "لا",
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "branches") {
      // تجميع بالذاكرة أصلاً داخل Repository - جلب واحد كافٍ (راجع التوثيق أعلى الدالة)
      const { rows } = await this.repository.branchesUsage(withPagination(query, MAX_EXPORT_ROWS), 0, MAX_EXPORT_ROWS);
      yield {
        rows: rows.map((b) => ({
          name: b.name,
          revenue: formatMoney(b.revenue),
          ordersCount: String(b.ordersCount),
          customersCount: String(b.customersCount),
          paymentsCount: String(b.paymentsCount),
          isActive: b.isActive ? "نعم" : "لا",
        })),
      };
      return;
    }

    if (query.type === "employees") {
      const { rows } = await this.repository.employeesUsage(withPagination(query, MAX_EXPORT_ROWS), 0, MAX_EXPORT_ROWS);
      yield {
        rows: rows.map((e) => ({
          name: e.name,
          email: e.email,
          role: ROLE_LABELS[e.role],
          ordersCreatedCount: String(e.ordersCreatedCount),
          paymentsProcessedCount: String(e.paymentsProcessedCount),
          paymentsProcessedAmount: formatMoney(e.paymentsProcessedAmount),
        })),
      };
      return;
    }

    // ==================== Phase 7: تقارير المخزون ====================

    if (query.type === "inventory") {
      const f = { type: query.itemType, supplierId: query.supplierId, sortBy: query.sortBy, sortOrder: query.sortOrder };
      for (;;) {
        const { rows, total } = await this.repository.inventoryReportList(f, skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((r) => ({
            sku: r.sku,
            name: r.name,
            type: ITEM_TYPE_LABELS[r.type] ?? r.type,
            unit: r.unit,
            supplierName: r.supplier?.name ?? "—",
            quantity: Number(r.quantity).toLocaleString("ar-EG"),
            reorderLevel: Number(r.reorderLevel).toLocaleString("ar-EG"),
            costPrice: formatMoney(r.costPrice),
            stockValue: formatMoney(Number(r.quantity) * Number(r.costPrice)),
            isActive: r.isActive ? "نعم" : "لا",
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "inventory-movements") {
      const f = {
        itemId: query.itemId,
        type: query.movementType,
        from: query.from,
        to: query.to,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      };
      for (;;) {
        const { rows, total } = await this.repository.movementsReportList(f, skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((r) => ({
            sku: r.item.sku,
            itemName: r.item.name,
            type: MOVEMENT_TYPE_LABELS[r.type] ?? r.type,
            quantity: Number(r.quantity).toLocaleString("ar-EG"),
            beforeQuantity: Number(r.beforeQuantity).toLocaleString("ar-EG"),
            afterQuantity: Number(r.afterQuantity).toLocaleString("ar-EG"),
            reference: r.reference ?? "—",
            createdAt: formatDate(r.createdAt),
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "inventory-suppliers") {
      const f = { sortBy: query.sortBy, sortOrder: query.sortOrder };
      for (;;) {
        const { rows, total } = await this.repository.suppliersReportList(f, skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((r) => ({
            name: r.name,
            contactName: r.contactName ?? "—",
            phone: r.phone ?? "—",
            purchasesCount: String(r.purchasesCount),
            totalSpent: formatMoney(r.totalSpent),
            isActive: r.isActive ? "نعم" : "لا",
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "inventory-purchases") {
      const f = {
        status: query.status,
        supplierId: query.supplierId,
        from: query.from,
        to: query.to,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      };
      for (;;) {
        const { rows, total } = await this.repository.purchasesReportList(f, skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((r) => ({
            purchaseNumber: r.purchaseNumber,
            supplierName: r.supplier.name,
            status: PURCHASE_STATUS_LABELS[r.status] ?? r.status,
            itemsCount: String(r._count.items),
            subtotal: formatMoney(r.subtotal),
            tax: formatMoney(r.tax),
            total: formatMoney(r.total),
            createdAt: formatDate(r.createdAt),
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "inventory-stock-value") {
      const f = { type: query.itemType, sortBy: query.sortBy, sortOrder: query.sortOrder };
      for (;;) {
        const { rows, total } = await this.repository.stockValueReportList(f, skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((r) => ({
            sku: r.sku,
            name: r.name,
            type: ITEM_TYPE_LABELS[r.type] ?? r.type,
            quantity: Number(r.quantity).toLocaleString("ar-EG"),
            costPrice: formatMoney(r.costPrice),
            stockValue: formatMoney(Number(r.quantity) * Number(r.costPrice)),
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    // ==================== Phase 8: تقارير الباركود ====================

    if (query.type === "barcode-most-scanned") {
      for (;;) {
        const { rows, total } = await this.repository.mostScannedReport(skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((r) => ({
            sku: r.sku,
            name: r.name,
            barcode: r.barcode ?? "—",
            scanCount: String(r.scanCount),
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "barcode-print-history") {
      for (;;) {
        const { rows, total } = await this.repository.printHistoryReport(skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((r) => ({
            sku: r.item?.sku ?? "—",
            itemName: r.item?.name ?? "—",
            size: LABEL_SIZE_LABELS[r.size] ?? r.size,
            quantity: String(r.quantity),
            templateName: r.templateName ?? "—",
            createdAt: formatDate(r.createdAt),
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "barcode-missing") {
      for (;;) {
        const { rows, total } = await this.repository.missingBarcodeReport(skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((r) => ({
            sku: r.sku,
            name: r.name,
            type: ITEM_TYPE_LABELS[r.type] ?? r.type,
            quantity: Number(r.quantity).toLocaleString("ar-EG"),
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "barcode-unused") {
      for (;;) {
        const { rows, total } = await this.repository.unusedBarcodeReport(skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((r) => ({
            sku: r.sku,
            name: r.name,
            barcode: r.barcode ?? "—",
            barcodeType: r.barcodeType ?? "—",
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "barcode-invalid") {
      const all = await this.repository.itemsWithBarcode();
      const invalid = all.filter(
        (i) => !i.barcodeType || !i.barcode || !isValidBarcodeValue(i.barcodeType, i.barcode),
      );
      yield {
        rows: invalid.slice(0, MAX_EXPORT_ROWS).map((r) => ({
          sku: r.sku,
          name: r.name,
          barcode: r.barcode ?? "—",
          barcodeType: r.barcodeType ?? "—",
        })),
      };
      return;
    }

    // ==================== Phase 9: تقارير الولاء/الكوبونات/العضوية ====================

    if (query.type === "loyalty-top-customers") {
      for (;;) {
        const { rows, total } = await this.repository.topCustomersLoyaltyReport(skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((r) => ({
            name: r.customer.name,
            phone: r.customer.phone,
            level: r.membershipLevel,
            currentPoints: String(r.currentPoints),
            lifetimePoints: String(r.lifetimePoints),
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "loyalty-points-balance") {
      for (;;) {
        const { rows, total } = await this.repository.pointsBalanceReport(skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((r) => ({
            name: r.customer.name,
            level: r.membershipLevel,
            currentPoints: String(r.currentPoints),
            lifetimePoints: String(r.lifetimePoints),
            redeemedPoints: String(r.redeemedPoints),
            expiredPoints: String(r.expiredPoints),
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "loyalty-points-history" || query.type === "loyalty-expired-points" || query.type === "loyalty-referral") {
      const txType = query.type === "loyalty-expired-points" ? "EXPIRE" : query.type === "loyalty-referral" ? "REFERRAL" : undefined;
      for (;;) {
        const { rows, total } = await this.repository.pointsHistoryReport(skip, BATCH_SIZE, txType);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((r) => ({
            customerName: r.customer.name,
            type: LOYALTY_TX_LABELS[r.type] ?? r.type,
            points: String(r.points),
            balanceAfter: String(r.balanceAfter),
            reference: r.reference ?? "—",
            createdAt: formatDate(r.createdAt),
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "coupon-usage") {
      for (;;) {
        const { rows, total } = await this.repository.couponUsageReport(skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((r) => ({
            code: r.coupon.code,
            type: r.coupon.type,
            customerName: r.customer?.name ?? "—",
            discountAmount: formatMoney(r.discountAmount),
            createdAt: formatDate(r.createdAt),
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "coupon-performance") {
      for (;;) {
        const { rows, total } = await this.repository.couponPerformanceReport(skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((r) => ({
            code: r.code,
            type: r.type,
            redemptions: String(r.redemptions),
            totalDiscount: formatMoney(r.totalDiscount),
            isActive: r.isActive ? "نعم" : "لا",
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "day-closings") {
      for (;;) {
        const { rows, total } = await this.repository.dayClosingsList(
          { status: query.status, from: query.from, to: query.to, sortBy: query.sortBy, sortOrder: query.sortOrder },
          skip,
          BATCH_SIZE,
        );
        if (rows.length === 0) break;
        yield {
          rows: rows.map((d) => {
            const snapshot = (d.snapshot as { totalRevenue?: number } | null) ?? null;
            return {
              businessDate: new Date(d.businessDate).toLocaleDateString("ar-EG"),
              status: DAY_STATUS_LABELS[d.status] ?? d.status,
              openingCash: formatMoney(d.openingCash),
              totalRevenue: formatMoney(snapshot?.totalRevenue ?? 0),
              expectedCash: formatMoney(d.expectedCash),
              actualCash: d.actualCash === null ? "—" : formatMoney(d.actualCash),
              cashDifference: d.cashDifference === null ? "—" : formatMoney(d.cashDifference),
              closedAt: formatDate(d.closedAt),
            };
          }),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "attendance") {
      for (;;) {
        const { rows, total } = await this.repository.attendanceReport(
          { from: query.from, to: query.to, status: query.status },
          skip,
          BATCH_SIZE,
        );
        if (rows.length === 0) break;
        yield {
          rows: rows.map((r) => ({
            employeeName: r.employee.user.name,
            workDate: new Date(r.workDate).toLocaleDateString("ar-EG"),
            clockIn: formatDate(r.clockInAt),
            clockOut: formatDate(r.clockOutAt),
            worked: minutesLabel(r.workedMinutes),
            late: minutesLabel(r.lateMinutes),
            overtime: minutesLabel(r.overtimeMinutes),
            status: ATTENDANCE_STATUS_LABELS[r.status] ?? r.status,
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "payroll") {
      for (;;) {
        const { rows, total } = await this.repository.payrollReport(skip, BATCH_SIZE);
        if (rows.length === 0) break;
        yield {
          rows: rows.map((p) => ({
            employeeName: p.employee.user.name,
            period: p.run.label,
            baseSalary: formatMoney(p.baseSalary),
            allowances: formatMoney(p.allowances),
            bonuses: formatMoney(p.bonuses),
            overtimePay: formatMoney(p.overtimePay),
            deductions: formatMoney(p.deductions),
            netSalary: formatMoney(p.netSalary),
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    if (query.type === "audit" || query.type === "security") {
      const actions = query.type === "security" ? SECURITY_AUDIT_ACTIONS : null;
      for (;;) {
        const { rows, total } = await this.repository.auditReport(
          { from: query.from, to: query.to, action: query.type === "audit" ? query.action : undefined },
          actions as unknown as readonly AuditAction[] | null,
          skip,
          BATCH_SIZE,
        );
        if (rows.length === 0) break;
        yield {
          rows: rows.map((a) => ({
            action: AUDIT_ACTION_AR[a.action] ?? a.action,
            actor: a.user?.name ?? "—",
            email: a.email ?? "—",
            ipAddress: a.ipAddress ?? "—",
            createdAt: formatDate(a.createdAt),
          })),
        };
        fetched += rows.length;
        skip += BATCH_SIZE;
        if (fetched >= total || fetched >= MAX_EXPORT_ROWS) break;
      }
      return;
    }

    // membership-distribution (تجميع صغير - دفعة واحدة)
    {
      const dist = await this.repository.membershipDistributionReport();
      yield {
        rows: dist.map((d) => ({
          level: d.level,
          count: String(d.count),
          totalLifetimePoints: String(d.totalLifetimePoints),
        })),
      };
    }
  }

  // ==================== CSV (تدفّق مباشر للاستجابة) ====================

  /** UTF-8 BOM + فواصل CSV سليمة (تهريب الاقتباس/الفاصلة/سطر جديد) - متوافق مع Excel وآمن للعربية */
  async writeCsv(res: Response, query: ExportQuery): Promise<number> {
    const columns = getReportColumns(query.type);
    res.write("﻿"); // UTF-8 BOM
    res.write(columns.map((c) => csvEscape(c.label)).join(",") + "\r\n");

    let count = 0;
    for await (const { rows } of this.streamRows(query)) {
      for (const row of rows) {
        res.write(columns.map((c) => csvEscape(row[c.key] ?? "")).join(",") + "\r\n");
        count++;
      }
    }
    return count;
  }

  // ==================== Excel (exceljs Streaming Writer - مباشرة للاستجابة) ====================

  async writeExcel(res: Response, query: ExportQuery, companyName: string): Promise<number> {
    const columns = getReportColumns(query.type);
    const totals = await this.getTotals(query);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res, useStyles: true });
    workbook.creator = companyName;
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(getReportTitle(query.type), {
      views: [{ rightToLeft: true }],
    });

    sheet.columns = columns.map((c) => ({
      header: c.label,
      key: c.key,
      // Auto Width تقريبي (لا Post-hoc Autofit ممكن مع الكتابة المتدفقة - راجع القيود بالتقرير)
      width: Math.max(c.label.length + 6, 14),
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    headerRow.alignment = { horizontal: "center" };
    headerRow.commit();

    let count = 0;
    for await (const { rows } of this.streamRows(query)) {
      for (const row of rows) {
        sheet.addRow(row).commit();
        count++;
      }
    }

    if (totals.length > 0) {
      sheet.addRow({}).commit();
      for (const t of totals) {
        const r = sheet.addRow({ [columns[0]!.key]: t.label, [columns[1]!.key]: t.value });
        r.font = { bold: true };
        r.commit();
      }
    }

    sheet.commit();
    await workbook.commit();
    return count;
  }

  // ==================== جمع كل الصفوف بالذاكرة - PDF/Print فقط (حدّ أدنى صارم - راجع report-pdf.service.ts) ====================

  async collectRowsForDocument(
    query: ExportQuery,
  ): Promise<{ rows: Record<string, string>[]; truncated: boolean }> {
    const rows: Record<string, string>[] = [];
    for await (const { rows: batch } of this.streamRows(query)) {
      for (const row of batch) {
        if (rows.length >= MAX_DOCUMENT_EXPORT_ROWS) return { rows, truncated: true };
        rows.push(row);
      }
    }
    return { rows, truncated: false };
  }
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
