import type {
  AuditAction,
  DayStatus,
  PaymentMethod,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import type { DayAggregations, DayClosingRow } from "./day-closing.types.js";

/**
 * مستودع إغلاق اليوم. التجميعات تقرأ من وحدات أخرى (orders/payments/invoices/
 * customers/loyalty/inventory) بنفس نمط backup/reports المُعتمَد - قراءة فقط،
 * بلا كتابة أو تعديل أي نموذج آخر.
 */
export class DayClosingRepository {
  constructor(private readonly db: PrismaClient) {}

  findById(id: string): Promise<DayClosingRow | null> {
    return this.db.dayClosing.findUnique({ where: { id } });
  }

  /** اليوم المفتوح حالياً (OPEN أو REOPENED) - واحد فقط على مستوى النظام */
  findOpenDay(): Promise<DayClosingRow | null> {
    return this.db.dayClosing.findFirst({
      where: { status: { in: ["OPEN", "REOPENED"] } },
      orderBy: { openedAt: "desc" },
    });
  }

  findByBusinessDate(businessDate: Date, branchId: string | null): Promise<DayClosingRow | null> {
    return this.db.dayClosing.findFirst({ where: { businessDate, branchId } });
  }

  create(data: Prisma.DayClosingCreateInput): Promise<DayClosingRow> {
    return this.db.dayClosing.create({ data });
  }

  update(id: string, data: Prisma.DayClosingUpdateInput): Promise<DayClosingRow> {
    return this.db.dayClosing.update({ where: { id }, data });
  }

  async list(params: {
    skip: number;
    take: number;
    status?: DayStatus;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ rows: DayClosingRow[]; total: number }> {
    const where: Prisma.DayClosingWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.dateFrom || params.dateTo) {
      where.businessDate = {};
      if (params.dateFrom) where.businessDate.gte = params.dateFrom;
      if (params.dateTo) where.businessDate.lte = params.dateTo;
    }
    const [rows, total] = await Promise.all([
      this.db.dayClosing.findMany({
        where,
        orderBy: { businessDate: "desc" },
        skip: params.skip,
        take: params.take,
      }),
      this.db.dayClosing.count({ where }),
    ]);
    return { rows, total };
  }

  recent(limit: number): Promise<DayClosingRow[]> {
    return this.db.dayClosing.findMany({
      where: { status: { in: ["CLOSED", "REOPENED"] } },
      orderBy: { closedAt: "desc" },
      take: limit,
    });
  }

  async statusCounts(): Promise<{ open: number; closed: number; total: number; lastClosedAt: Date | null }> {
    const [open, closed, total, last] = await Promise.all([
      this.db.dayClosing.count({ where: { status: { in: ["OPEN", "REOPENED"] } } }),
      this.db.dayClosing.count({ where: { status: "CLOSED" } }),
      this.db.dayClosing.count(),
      this.db.dayClosing.findFirst({
        where: { closedAt: { not: null } },
        orderBy: { closedAt: "desc" },
        select: { closedAt: true },
      }),
    ]);
    return { open, closed, total, lastClosedAt: last?.closedAt ?? null };
  }

  /**
   * يبني كل التجميعات المحاسبية لنافذة زمنية [from, to] - قراءة عابرة للوحدات.
   * كل الاستعلامات متوازية. لا كتابة إطلاقاً.
   */
  async aggregate(from: Date, to: Date): Promise<DayAggregations> {
    const orderWhere: Prisma.OrderWhereInput = { createdAt: { gte: from, lte: to } };
    const paymentWhere: Prisma.PaymentWhereInput = {
      status: "COMPLETED",
      createdAt: { gte: from, lte: to },
    };

    const [
      orderAgg,
      ordersByStatusRaw,
      paymentAgg,
      paymentsByMethodRaw,
      refundAgg,
      invoiceAgg,
      newCustomers,
      pointsEarnedAgg,
      pointsRedeemedAgg,
      lowStockAlerts,
      outOfStockAlerts,
      purchaseAgg,
      inventoryValueRaw,
      inventoryMovements,
      couponsUsed,
      employeesWorked,
      overtimeAgg,
    ] = await Promise.all([
      this.db.order.aggregate({
        where: orderWhere,
        _count: { _all: true },
        _sum: { subtotal: true, discount: true, total: true },
      }),
      this.db.order.groupBy({ by: ["status"], where: orderWhere, _count: { _all: true } }),
      this.db.payment.aggregate({
        where: paymentWhere,
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.db.payment.groupBy({ by: ["method"], where: paymentWhere, _sum: { amount: true } }),
      this.db.payment.aggregate({
        where: { createdAt: { gte: from, lte: to } },
        _sum: { refundedAmount: true },
      }),
      this.db.invoice.aggregate({
        where: { issuedAt: { gte: from, lte: to } },
        _count: { _all: true },
        _sum: { total: true, tax: true },
      }),
      this.db.customer.count({ where: { createdAt: { gte: from, lte: to } } }),
      this.db.loyaltyTransaction.aggregate({
        where: { type: { in: ["EARN", "BONUS", "WELCOME", "BIRTHDAY", "REFERRAL"] }, createdAt: { gte: from, lte: to } },
        _sum: { points: true },
      }),
      this.db.loyaltyTransaction.aggregate({
        where: { type: "REDEEM", createdAt: { gte: from, lte: to } },
        _sum: { points: true },
      }),
      this.db.inventoryAlert.count({ where: { status: "OPEN", type: "LOW_STOCK" } }),
      this.db.inventoryAlert.count({ where: { status: "OPEN", type: "OUT_OF_STOCK" } }),
      this.db.purchase.aggregate({
        where: { createdAt: { gte: from, lte: to } },
        _count: { _all: true },
        _sum: { total: true },
      }),
      // قيمة المخزون نقطة زمنية (الرصيد × متوسط التكلفة) - إجمالي عام لا نافذة
      this.db.inventoryItem.findMany({ select: { quantity: true, costPrice: true } }),
      this.db.inventoryTransaction.count({ where: { createdAt: { gte: from, lte: to } } }),
      this.db.couponRedemption.count({ where: { reversed: false, createdAt: { gte: from, lte: to } } }),
      // الحضور ضمن نطاق تواريخ النافذة (workDate تاريخ فقط) - Phase 9.6b
      this.db.attendanceRecord.count({
        where: {
          workDate: { gte: dateOnly(from), lte: dateOnly(to) },
          status: { in: ["PRESENT", "LATE", "HALF_DAY"] },
        },
      }),
      this.db.attendanceRecord.aggregate({
        where: { workDate: { gte: dateOnly(from), lte: dateOnly(to) } },
        _sum: { overtimeMinutes: true },
      }),
    ]);

    const inventoryValue = inventoryValueRaw.reduce(
      (sum, it) => sum + it.quantity.toNumber() * it.costPrice.toNumber(),
      0,
    );

    const ordersByStatus: Record<string, number> = {};
    for (const row of ordersByStatusRaw) ordersByStatus[row.status] = row._count._all;

    const byMethod: Record<PaymentMethod, number> = {
      CASH: 0,
      CARD: 0,
      BANK_TRANSFER: 0,
      MOBILE_WALLET: 0,
    };
    for (const row of paymentsByMethodRaw) {
      byMethod[row.method] = row._sum.amount?.toNumber() ?? 0;
    }

    return {
      ordersCount: orderAgg._count._all,
      ordersByStatus,
      ordersSubtotal: orderAgg._sum.subtotal?.toNumber() ?? 0,
      ordersDiscount: orderAgg._sum.discount?.toNumber() ?? 0,
      ordersTotal: orderAgg._sum.total?.toNumber() ?? 0,

      paymentsCount: paymentAgg._count._all,
      totalRevenue: paymentAgg._sum.amount?.toNumber() ?? 0,
      paymentsByMethod: byMethod,
      cashSales: byMethod.CASH,
      cardSales: byMethod.CARD,
      bankSales: byMethod.BANK_TRANSFER,
      walletSales: byMethod.MOBILE_WALLET,
      refundsTotal: refundAgg._sum.refundedAmount?.toNumber() ?? 0,

      invoicesCount: invoiceAgg._count._all,
      invoicesTotal: invoiceAgg._sum.total?.toNumber() ?? 0,
      taxTotal: invoiceAgg._sum.tax?.toNumber() ?? 0,

      discountTotal: orderAgg._sum.discount?.toNumber() ?? 0,
      netSales: round2((paymentAgg._sum.amount?.toNumber() ?? 0) - (refundAgg._sum.refundedAmount?.toNumber() ?? 0)),

      newCustomers,

      purchasesCount: purchaseAgg._count._all,
      purchasesTotal: purchaseAgg._sum.total?.toNumber() ?? 0,

      inventoryValue: round2(inventoryValue),
      inventoryMovements,

      pointsEarned: pointsEarnedAgg._sum.points ?? 0,
      pointsRedeemed: Math.abs(pointsRedeemedAgg._sum.points ?? 0),
      couponsUsed,

      employeesWorked,
      overtimeHours: round2((overtimeAgg._sum.overtimeMinutes ?? 0) / 60),

      lowStockAlerts,
      outOfStockAlerts,
    };
  }

  /**
   * فحص جاهزية ما قبل الإغلاق - عدّادات لبنود معلّقة عبر الوحدات. تُدرَج فقط
   * البنود ذات مصدر بيانات حقيقي في الـSchema الحالي (بلا اختلاق): مسودات
   * الطلبات/طلب الاسترداد المعلّق/اعتماد الجرد/مهام الباركود/الجدولة الفاشلة
   * لا نماذج لها فتُستثنى صراحةً - راجع القيود بالتقرير.
   */
  async preCloseCounts(businessDate: Date): Promise<{
    priorOpenDays: number;
    pendingPayments: number;
    draftInvoices: number;
    inProgressOrders: number;
    readyOrders: number;
    draftPurchases: number;
    pendingPurchases: number;
    negativeInventory: number;
    failedBackups: number;
    failedNotifications: number;
    openStockAlerts: number;
  }> {
    const [
      priorOpenDays,
      pendingPayments,
      draftInvoices,
      inProgressOrders,
      readyOrders,
      draftPurchases,
      pendingPurchases,
      negativeInventory,
      failedBackups,
      failedNotifications,
      openStockAlerts,
    ] = await Promise.all([
      this.db.dayClosing.count({
        where: { status: { in: ["OPEN", "REOPENED"] }, businessDate: { lt: businessDate } },
      }),
      this.db.payment.count({ where: { status: "PENDING" } }),
      this.db.invoice.count({ where: { status: "DRAFT" } }),
      this.db.order.count({
        where: { status: { in: ["RECEIVED", "INSPECTING", "WASHING", "DRYING", "IRONING", "PACKING"] } },
      }),
      this.db.order.count({ where: { status: "READY" } }),
      this.db.purchase.count({ where: { status: "DRAFT" } }),
      this.db.purchase.count({ where: { status: "ORDERED" } }),
      this.db.inventoryItem.count({ where: { quantity: { lt: 0 } } }),
      this.db.backupRecord.count({ where: { status: "FAILED" } }),
      this.db.notificationDelivery.count({ where: { status: "FAILED" } }),
      this.db.inventoryAlert.count({ where: { status: "OPEN" } }),
    ]);
    return {
      priorOpenDays,
      pendingPayments,
      draftInvoices,
      inProgressOrders,
      readyOrders,
      draftPurchases,
      pendingPurchases,
      negativeInventory,
      failedBackups,
      failedNotifications,
      openStockAlerts,
    };
  }

  createAuditLog(entry: {
    action: AuditAction;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Prisma.InputJsonValue;
  }): Promise<unknown> {
    return this.db.auditLog.create({ data: entry });
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** يحوّل timestamp إلى منتصف ليل UTC (لمقارنة عمود workDate من نوع @db.Date) */
function dateOnly(d: Date): Date {
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}
