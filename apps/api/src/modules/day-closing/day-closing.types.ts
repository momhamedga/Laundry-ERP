import type { DayClosing, DayStatus, PaymentMethod } from "@prisma/client";

export type { DayStatus };

export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * لقطة التجميعات المحاسبية لنافذة اليوم (من فتح اليوم حتى الإغلاق/اللحظة).
 * النافذة زمنية فعلية [openedAt, toDate] - لا اعتماد على منطقة زمنية (نمط جلسة
 * Odoo POS: نجمّع ما جرى فعلاً أثناء الوردية)، فتفادينا أي مكتبة توقيت.
 */
export interface DayAggregations {
  // الطلبات
  ordersCount: number;
  ordersByStatus: Record<string, number>;
  ordersSubtotal: number;
  ordersDiscount: number;
  ordersTotal: number;

  // المدفوعات (COMPLETED فقط ضمن النافذة)
  paymentsCount: number;
  totalRevenue: number; // إجمالي المقبوضات المكتملة
  paymentsByMethod: Record<PaymentMethod, number>;
  cashSales: number; // مقبوضات نقدية فقط (تدخل حساب الصندوق)
  cardSales: number; // بطاقة
  bankSales: number; // تحويل بنكي
  walletSales: number; // محفظة إلكترونية
  refundsTotal: number; // إجمالي المبالغ المستردة ضمن النافذة

  // الفواتير
  invoicesCount: number;
  invoicesTotal: number;
  taxTotal: number;

  // خصم / صافٍ (Phase 9.6 - Net = المقبوضات المكتملة - المرتجعات؛ الربح الحقيقي
  // يحتاج COGS غير مرتبط بالطلبات في الـSchema الحالي، فلا يُختلق - راجع القيود)
  discountTotal: number;
  netSales: number;

  // العملاء
  newCustomers: number;

  // المشتريات (Phase 9.6)
  purchasesCount: number;
  purchasesTotal: number;

  // المخزون (Phase 9.6)
  inventoryValue: number; // نقطة زمنية: مجموع الرصيد × متوسط التكلفة لكل الأصناف
  inventoryMovements: number; // عدد حركات المخزون ضمن نافذة الوردية

  // الولاء / الكوبونات
  pointsEarned: number;
  pointsRedeemed: number;
  couponsUsed: number;

  // الموارد البشرية (Phase 9.6b - تُملأ من وحدة الحضور؛ 0 إن لم تُفعَّل بعد)
  employeesWorked: number;
  overtimeHours: number;

  // المخزون / الصحة
  lowStockAlerts: number;
  outOfStockAlerts: number;
}

/** خطورة بند فحص ما قبل الإغلاق: blocking يمنع الإغلاق إلا بموافقة ADMIN (force) */
export type PreCloseSeverity = "blocking" | "warning" | "info";

export interface PreCloseCheckItem {
  key: string;
  label: string;
  severity: PreCloseSeverity;
  count: number;
}

export interface PreCloseCheckResult {
  ready: boolean; // لا موانع ولا تحذيرات
  hasBlocking: boolean; // يوجد مانع صارم (لا يُغلق حتى مع force للمدير غير مسموح)
  hasWarnings: boolean;
  items: PreCloseCheckItem[];
}

export interface DayCashSummary {
  openingCash: number;
  cashIn: number;
  cashOut: number;
  cashSales: number;
  expectedCash: number;
  actualCash: number | null;
  cashDifference: number | null;
}

/** الشكل المُعاد للعميل - القيم النقدية أرقام (لا Decimal) + snapshot مُوسَّع */
export interface DayClosingView {
  id: string;
  branchId: string | null;
  businessDate: string; // YYYY-MM-DD
  status: DayStatus;
  openingCash: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  actualCash: number | null;
  cashDifference: number | null;
  differenceNote: string | null;
  snapshot: DayAggregations | null;
  openedAt: string;
  openedById: string | null;
  closedAt: string | null;
  closedById: string | null;
  reopenedAt: string | null;
  reopenedById: string | null;
  reopenReason: string | null;
  approvedAt: string | null;
  approvedById: string | null;
  lockedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListDayClosingsResult {
  closings: DayClosingView[];
  meta: PaginationMeta;
}

/** بطاقات لوحة إغلاق اليوم - الوضع الحالي + حيّة إن كان اليوم مفتوحاً */
export interface DayClosingDashboard {
  current: DayClosingView | null;
  live: DayAggregations | null; // تجميع حيّ للوردية المفتوحة (null إن لا يوجد يوم مفتوح)
  cash: DayCashSummary | null;
  recent: DayClosingView[]; // آخر عمليات إغلاق
  stats: {
    openDays: number;
    closedDays: number;
    totalClosings: number;
    lastClosedAt: string | null;
  };
}

export type DayClosingRow = DayClosing;
