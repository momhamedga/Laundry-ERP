import type { Prisma } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { AuthenticatedUser, RequestContext } from "../auth/index.js";
import { notificationBus } from "../notifications/notification.bus.js";
import { businessDateFor, DASHBOARD_RECENT_LIMIT, formatBusinessDate } from "./day-closing.constants.js";
import type { DayClosingRepository } from "./day-closing.repository.js";
import type {
  CashMovementDto,
  CloseDayDto,
  ListDayClosingsQueryDto,
  OpenDayDto,
  ReopenDayDto,
} from "./day-closing.dto.js";
import type {
  DayAggregations,
  DayCashSummary,
  DayClosingDashboard,
  DayClosingRow,
  DayClosingView,
  ListDayClosingsResult,
  PreCloseCheckItem,
  PreCloseCheckResult,
} from "./day-closing.types.js";

export class DayClosingService {
  constructor(private readonly repo: DayClosingRepository) {}

  // ==================== سير العمل ====================

  /** فتح يوم عمل جديد - يشترط عدم وجود يوم مفتوح، وعدم وجود إغلاق لتاريخ اليوم */
  async openDay(actor: AuthenticatedUser, ctx: RequestContext, dto: OpenDayDto): Promise<DayClosingView> {
    const existingOpen = await this.repo.findOpenDay();
    if (existingOpen) {
      throw new ApiError(409, "يوجد يوم عمل مفتوح بالفعل - أغلقه أولاً قبل فتح يوم جديد");
    }

    const businessDate = businessDateFor();
    const branchId = dto.branchId ?? actor.branchId ?? null;
    const dupe = await this.repo.findByBusinessDate(businessDate, branchId);
    if (dupe) {
      throw new ApiError(
        409,
        "يوجد سجل إغلاق لتاريخ اليوم بالفعل - استخدم إعادة الفتح للتعديل عليه",
      );
    }

    const openingCash = dto.openingCash ?? 0;
    const row = await this.repo.create({
      businessDate,
      branchId,
      status: "OPEN",
      openingCash,
      expectedCash: openingCash,
      openedById: actor.id,
      notes: dto.notes ?? null,
    });

    await this.audit(actor, ctx, "DAY_OPENED", row.id, {
      businessDate: formatBusinessDate(businessDate),
      openingCash,
    });

    this.emit({
      type: "DAY_OPENED",
      data: {
        dayClosingId: row.id,
        businessDate: formatBusinessDate(businessDate),
        openingCash,
        openedByEmail: actor.email,
      },
    });

    return this.toView(row);
  }

  /** إغلاق اليوم المفتوح - يبني اللقطة النهائية ويقفل الفترة */
  async closeDay(actor: AuthenticatedUser, ctx: RequestContext, dto: CloseDayDto): Promise<DayClosingView> {
    const open = await this.repo.findOpenDay();
    if (!open) throw new ApiError(409, "لا يوجد يوم عمل مفتوح لإغلاقه");

    // فحص ما قبل الإغلاق - الموانع الصارمة تمنع دائماً؛ التحذيرات تمنع إلا
    // بتأكيد force من ADMIN فقط (نمط أنظمة المحاسبة)
    const check = await this.buildPreCloseCheck(open.businessDate);
    if (check.hasBlocking) {
      throw new ApiError(
        409,
        "يوجد موانع صارمة تمنع إغلاق اليوم (مثل يوم سابق مفتوح) - عالجها أولاً",
      );
    }
    if (check.hasWarnings && !dto.force) {
      throw new ApiError(
        409,
        "يوجد تحذيرات ما قبل الإغلاق - راجعها وأكّد الإغلاق (يتطلب صلاحية ADMIN)",
      );
    }
    if (check.hasWarnings && dto.force && actor.role !== "ADMIN") {
      throw new ApiError(403, "تجاوز تحذيرات الإغلاق متاح لمدير النظام فقط");
    }

    const now = new Date();
    const snapshot = await this.repo.aggregate(open.openedAt, now);

    const openingCash = open.openingCash.toNumber();
    const cashIn = (dto.cashIn ?? open.cashIn.toNumber()) || 0;
    const cashOut = (dto.cashOut ?? open.cashOut.toNumber()) || 0;
    const expectedCash = round2(openingCash + snapshot.cashSales + cashIn - cashOut);
    const cashDifference = round2(dto.actualCash - expectedCash);

    if (cashDifference !== 0 && !dto.differenceNote) {
      throw new ApiError(400, "يوجد فرق في الصندوق - سبب الفرق مطلوب لإتمام الإغلاق");
    }

    const row = await this.repo.update(open.id, {
      status: "CLOSED",
      cashIn,
      cashOut,
      expectedCash,
      actualCash: dto.actualCash,
      cashDifference,
      differenceNote: dto.differenceNote ?? null,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
      closedAt: now,
      closedById: actor.id,
      lockedAt: now,
      notes: dto.notes ?? open.notes,
    });

    await this.audit(actor, ctx, "DAY_CLOSED", row.id, {
      businessDate: formatBusinessDate(open.businessDate),
      expectedCash,
      actualCash: dto.actualCash,
      cashDifference,
      totalRevenue: snapshot.totalRevenue,
    });

    this.emit({
      type: "DAY_CLOSED",
      data: {
        dayClosingId: row.id,
        businessDate: formatBusinessDate(open.businessDate),
        totalRevenue: snapshot.totalRevenue,
        cashDifference,
        closedByEmail: actor.email,
      },
    });

    return this.toView(row);
  }

  /** إعادة فتح يوم مُغلق - ADMIN فقط + سبب إلزامي (يفكّ القفل) */
  async reopenDay(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    id: string,
    dto: ReopenDayDto,
  ): Promise<DayClosingView> {
    if (actor.role !== "ADMIN") {
      throw new ApiError(403, "إعادة فتح اليوم متاحة لمدير النظام فقط");
    }
    const day = await this.repo.findById(id);
    if (!day) throw new ApiError(404, "سجل الإغلاق غير موجود");
    if (day.status !== "CLOSED") {
      throw new ApiError(409, "لا يمكن إعادة فتح يوم غير مُغلق");
    }
    const otherOpen = await this.repo.findOpenDay();
    if (otherOpen) {
      throw new ApiError(409, "يوجد يوم عمل مفتوح آخر - أغلقه قبل إعادة فتح هذا اليوم");
    }

    const now = new Date();
    const row = await this.repo.update(id, {
      status: "REOPENED",
      reopenedAt: now,
      reopenedById: actor.id,
      reopenReason: dto.reason,
      lockedAt: null,
    });

    await this.audit(actor, ctx, "DAY_REOPENED", row.id, {
      businessDate: formatBusinessDate(day.businessDate),
      reason: dto.reason,
    });

    this.emit({
      type: "DAY_REOPENED",
      data: {
        dayClosingId: row.id,
        businessDate: formatBusinessDate(day.businessDate),
        reason: dto.reason,
        reopenedByEmail: actor.email,
      },
    });

    return this.toView(row);
  }

  /** اعتماد يوم مُغلق (مراجعة الصندوق) */
  async approveDay(actor: AuthenticatedUser, ctx: RequestContext, id: string): Promise<DayClosingView> {
    const day = await this.repo.findById(id);
    if (!day) throw new ApiError(404, "سجل الإغلاق غير موجود");
    if (day.status !== "CLOSED") {
      throw new ApiError(409, "لا يمكن اعتماد يوم غير مُغلق");
    }
    if (day.approvedAt) throw new ApiError(409, "هذا اليوم معتمد بالفعل");

    const row = await this.repo.update(id, { approvedAt: new Date(), approvedById: actor.id });
    await this.audit(actor, ctx, "DAY_APPROVED", row.id, {
      businessDate: formatBusinessDate(day.businessDate),
    });
    return this.toView(row);
  }

  /** حركة نقدية يدوية (إيداع/سحب) على الوردية المفتوحة */
  async recordCashMovement(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    dto: CashMovementDto,
  ): Promise<DayClosingView> {
    const open = await this.repo.findOpenDay();
    if (!open) throw new ApiError(409, "لا يوجد يوم عمل مفتوح لتسجيل حركة نقدية");

    const cashIn = open.cashIn.toNumber() + (dto.type === "IN" ? dto.amount : 0);
    const cashOut = open.cashOut.toNumber() + (dto.type === "OUT" ? dto.amount : 0);
    const expectedCash = round2(open.openingCash.toNumber() + cashIn - cashOut);

    const row = await this.repo.update(open.id, {
      cashIn,
      cashOut,
      expectedCash,
    });

    await this.audit(actor, ctx, "DAY_OPENED", row.id, {
      cashMovement: dto.type,
      amount: dto.amount,
      note: dto.note ?? null,
    });

    return this.toView(row);
  }

  // ==================== قراءة ====================

  async getCurrent(): Promise<DayClosingView | null> {
    const open = await this.repo.findOpenDay();
    return open ? this.toView(open) : null;
  }

  /** فحص جاهزية ما قبل الإغلاق لليوم المفتوح (أو لتاريخ اليوم إن لا يوجد مفتوح) */
  async preCloseCheck(): Promise<PreCloseCheckResult> {
    const open = await this.repo.findOpenDay();
    const businessDate = open?.businessDate ?? businessDateFor();
    return this.buildPreCloseCheck(businessDate);
  }

  private async buildPreCloseCheck(businessDate: Date): Promise<PreCloseCheckResult> {
    const c = await this.repo.preCloseCounts(businessDate);
    const raw: PreCloseCheckItem[] = [
      { key: "priorOpenDays", label: "أيام عمل سابقة مفتوحة", severity: "blocking", count: c.priorOpenDays },
      { key: "pendingPayments", label: "مدفوعات معلّقة", severity: "warning", count: c.pendingPayments },
      { key: "draftInvoices", label: "فواتير مسودة", severity: "warning", count: c.draftInvoices },
      { key: "inProgressOrders", label: "طلبات قيد التنفيذ", severity: "warning", count: c.inProgressOrders },
      { key: "readyOrders", label: "طلبات جاهزة لم تُسلَّم", severity: "info", count: c.readyOrders },
      { key: "draftPurchases", label: "مشتريات مسودة", severity: "warning", count: c.draftPurchases },
      { key: "pendingPurchases", label: "مشتريات مطلوبة لم تُستلَم", severity: "warning", count: c.pendingPurchases },
      { key: "negativeInventory", label: "أصناف برصيد سالب", severity: "warning", count: c.negativeInventory },
      { key: "failedBackups", label: "نسخ احتياطية فاشلة", severity: "warning", count: c.failedBackups },
      { key: "failedNotifications", label: "إشعارات فاشلة في الطابور", severity: "warning", count: c.failedNotifications },
      { key: "openStockAlerts", label: "تنبيهات مخزون مفتوحة", severity: "info", count: c.openStockAlerts },
    ];
    const items = raw.filter((i) => i.count > 0);

    const hasBlocking = items.some((i) => i.severity === "blocking");
    const hasWarnings = items.some((i) => i.severity === "warning");
    return { ready: items.length === 0, hasBlocking, hasWarnings, items };
  }

  async getById(id: string): Promise<DayClosingView> {
    const row = await this.repo.findById(id);
    if (!row) throw new ApiError(404, "سجل الإغلاق غير موجود");
    return this.toView(row);
  }

  async list(query: ListDayClosingsQueryDto): Promise<ListDayClosingsResult> {
    const { page, limit } = query;
    const { rows, total } = await this.repo.list({
      skip: (page - 1) * limit,
      take: limit,
      status: query.status,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
    return { closings: rows.map((r) => this.toView(r)), meta: this.meta(page, limit, total) };
  }

  async getDashboard(): Promise<DayClosingDashboard> {
    const open = await this.repo.findOpenDay();
    const [recent, counts] = await Promise.all([
      this.repo.recent(DASHBOARD_RECENT_LIMIT),
      this.repo.statusCounts(),
    ]);

    let live: DayAggregations | null = null;
    let cash: DayCashSummary | null = null;
    if (open) {
      live = await this.repo.aggregate(open.openedAt, new Date());
      const openingCash = open.openingCash.toNumber();
      const cashIn = open.cashIn.toNumber();
      const cashOut = open.cashOut.toNumber();
      const expectedCash = round2(openingCash + live.cashSales + cashIn - cashOut);
      cash = {
        openingCash,
        cashIn,
        cashOut,
        cashSales: live.cashSales,
        expectedCash,
        actualCash: null,
        cashDifference: null,
      };
    }

    return {
      current: open ? this.toView(open) : null,
      live,
      cash,
      recent: recent.map((r) => this.toView(r)),
      stats: {
        openDays: counts.open,
        closedDays: counts.closed,
        totalClosings: counts.total,
        lastClosedAt: counts.lastClosedAt?.toISOString() ?? null,
      },
    };
  }

  /** للـ middleware: هل فترة اليوم الحالي مقفلة (اليوم مُغلق)؟ */
  async isTodayLocked(): Promise<boolean> {
    const businessDate = businessDateFor();
    const today = await this.repo.findByBusinessDate(businessDate, null);
    return today?.status === "CLOSED";
  }

  // ==================== مساعدات ====================

  private toView(row: DayClosingRow): DayClosingView {
    return {
      id: row.id,
      branchId: row.branchId,
      businessDate: formatBusinessDate(row.businessDate),
      status: row.status,
      openingCash: row.openingCash.toNumber(),
      cashIn: row.cashIn.toNumber(),
      cashOut: row.cashOut.toNumber(),
      expectedCash: row.expectedCash.toNumber(),
      actualCash: row.actualCash?.toNumber() ?? null,
      cashDifference: row.cashDifference?.toNumber() ?? null,
      differenceNote: row.differenceNote,
      snapshot: (row.snapshot as unknown as DayAggregations | null) ?? null,
      openedAt: row.openedAt.toISOString(),
      openedById: row.openedById,
      closedAt: row.closedAt?.toISOString() ?? null,
      closedById: row.closedById,
      reopenedAt: row.reopenedAt?.toISOString() ?? null,
      reopenedById: row.reopenedById,
      reopenReason: row.reopenReason,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      approvedById: row.approvedById,
      lockedAt: row.lockedAt?.toISOString() ?? null,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private meta(page: number, limit: number, total: number) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
  }

  private async audit(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    action: "DAY_OPENED" | "DAY_CLOSED" | "DAY_REOPENED" | "DAY_APPROVED",
    dayId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.createAuditLog({
      action,
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { dayClosingId: dayId, ...metadata } as Prisma.InputJsonValue,
    });
  }

  /** إشعار fire-and-forget - فشله لا يُفشِل عملية الإغلاق */
  private emit(event: Parameters<typeof notificationBus.emitNotification>[0]): void {
    try {
      notificationBus.emitNotification(event);
    } catch {
      // متعمّد: بثّ الإشعار لا يجب أن يُفشِل معاملة العمل
    }
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
