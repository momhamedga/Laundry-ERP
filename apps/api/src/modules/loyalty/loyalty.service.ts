import type { AuditAction, Campaign, LoyaltySettings, Prisma } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { RequestContext } from "../auth/auth.types.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { MembershipService } from "../membership/index.js";
import { notificationBus } from "../notifications/index.js";
import { MAX_EXPIRE_BATCH } from "./loyalty.constants.js";
import type {
  AdjustDto,
  BonusDto,
  CreateCampaignDto,
  HistoryQuery,
  ListAccountsQuery,
  ListCampaignsQuery,
  RedeemDto,
  RedeemQuery,
  UpdateCampaignDto,
  UpdateSettingsDto,
} from "./loyalty.dto.js";
import type { LoyaltyRepository } from "./loyalty.repository.js";
import type {
  AccountSummary,
  ListAccountsResult,
  ListCampaignsResult,
  ListHistoryResult,
  LoyaltyStats,
  RedeemQuote,
  RedeemResult,
} from "./loyalty.types.js";

export class LoyaltyService {
  constructor(
    private readonly repo: LoyaltyRepository,
    private readonly membership: MembershipService,
  ) {}

  // ==================== Read ====================

  async getSummary(customerId: string): Promise<AccountSummary> {
    const account = await this.repo.findAccountWithCustomer(customerId);
    if (!account) throw new ApiError(404, "Customer has no loyalty account yet");
    return {
      customerId,
      customerName: account.customer.name,
      currentPoints: account.currentPoints,
      lifetimePoints: account.lifetimePoints,
      redeemedPoints: account.redeemedPoints,
      expiredPoints: account.expiredPoints,
      pendingPoints: 0, // لا آلية حجز حالياً - available = current (يُوثَّق كقيد)
      availablePoints: account.currentPoints,
      membershipLevel: account.membershipLevel,
      levelSince: account.levelSince,
    };
  }

  listAccounts(query: ListAccountsQuery): Promise<ListAccountsResult> {
    return this.repo.listAccounts(query);
  }
  listHistory(query: HistoryQuery): Promise<ListHistoryResult> {
    return this.repo.listHistory(query);
  }
  getStats(): Promise<LoyaltyStats> {
    return this.repo.getStats();
  }
  getSettings(): Promise<LoyaltySettings> {
    return this.repo.getOrCreateSettings();
  }

  async updateSettings(dto: UpdateSettingsDto, actor: AuthenticatedUser, ctx: RequestContext): Promise<LoyaltySettings> {
    await this.repo.getOrCreateSettings();
    const settings = await this.repo.updateSettings(dto);
    await this.audit("LOYALTY_SETTINGS_UPDATED", actor, ctx, { changes: dto });
    return settings;
  }

  // ==================== Earn (from order via bus integration) ====================

  /** يُحسب ويُضاف نقاط طلب - idempotent (لا يكرّر لنفس الطلب) */
  async earnFromOrder(orderId: string): Promise<void> {
    const existing = await this.repo.findEarnTxForOrder(orderId);
    if (existing) return; // مُنح سابقاً

    const order = await this.repo.readOrderForEarn(orderId);
    if (!order) return;

    const settings = await this.repo.getOrCreateSettings();
    const total = Number(order.total);
    if (total < Number(settings.minOrderForPoints)) return;

    let points =
      settings.earnMode === "PERCENTAGE"
        ? Math.round(total * Number(settings.pointsPerCurrency))
        : Math.round(Number(settings.pointsPerCurrency));

    // نقاط إضافية حسب مستوى العضوية
    const account = await this.repo.getOrCreateAccount(order.customerId);
    const tier = await this.membership.getTierBenefits(account.membershipLevel);
    const extraPct = Number(tier.extraPointsPercent);
    if (extraPct > 0) points += Math.round((points * extraPct) / 100);

    if (settings.maxPointsPerOrder != null) points = Math.min(points, settings.maxPointsPerOrder);
    if (points <= 0) return;

    const expiresAt = settings.pointExpiryDays
      ? new Date(Date.now() + settings.pointExpiryDays * 86_400_000)
      : null;

    const { account: updated } = await this.repo.applyLedger({
      customerId: order.customerId,
      type: "EARN",
      source: "ORDER",
      signedPoints: points,
      lifetimeDelta: points,
      orderId,
      reference: order.orderNumber,
      expiresAt,
    });

    this.emit({
      type: "POINTS_EARNED",
      data: { customerId: order.customerId, customerName: order.customer.name, points, balance: updated.currentPoints },
    });
    await this.membership.reevaluateForCustomer(order.customerId, updated.lifetimePoints, order.customer.name);
  }

  /** عكس نقاط طلب عند الإلغاء/الاسترداد - يعكس EARN + يستعيد REDEEM */
  async reverseOrder(orderId: string): Promise<void> {
    const earn = await this.repo.findEarnTxForOrder(orderId);
    if (earn) {
      await this.repo.applyLedger({
        customerId: earn.customerId,
        type: "REVERSE",
        source: "ORDER",
        signedPoints: -earn.points,
        lifetimeDelta: -earn.points,
        orderId,
        reference: earn.reference,
        note: "عكس نقاط طلب ملغى/مسترد",
      });
      await this.repo.markReversed(earn.id);
      await this.reevaluate(earn.customerId);
    }
    // استعادة النقاط المستبدلة على الطلب (إن وُجدت)
    const redeems = await this.repo.findRedeemTxForOrder(orderId);
    for (const r of redeems) {
      await this.repo.applyLedger({
        customerId: r.customerId,
        type: "REVERSE",
        source: "ORDER",
        signedPoints: -r.points, // r.points سالب (استبدال) → عكسه يعيدها موجبة
        redeemedDelta: r.points, // r.points سالب → يقلّل redeemed
        orderId,
        note: "استعادة نقاط مستبدلة",
      });
      await this.repo.markReversed(r.id);
    }
  }

  // ==================== Redeem ====================

  async redeemQuote(query: RedeemQuery): Promise<RedeemQuote> {
    const [account, settings] = await Promise.all([
      this.repo.findAccountWithCustomer(query.customerId),
      this.repo.getOrCreateSettings(),
    ]);
    const current = account?.currentPoints ?? 0;
    const discountAmount = Number((query.points * Number(settings.redeemValue)).toFixed(2));
    if (query.points > current) return { points: query.points, discountAmount, eligible: false, reason: "نقاط غير كافية" };
    if (query.points < settings.minPointsToRedeem)
      return { points: query.points, discountAmount, eligible: false, reason: `الحد الأدنى ${settings.minPointsToRedeem} نقطة` };
    return { points: query.points, discountAmount, eligible: true };
  }

  async redeem(dto: RedeemDto, actor: AuthenticatedUser, ctx: RequestContext): Promise<RedeemResult> {
    const account = await this.repo.findAccountWithCustomer(dto.customerId);
    if (!account) throw new ApiError(404, "Customer has no loyalty account");
    const settings = await this.repo.getOrCreateSettings();
    if (dto.points < settings.minPointsToRedeem) throw new ApiError(400, `Minimum ${settings.minPointsToRedeem} points to redeem`);
    if (dto.points > account.currentPoints) throw new ApiError(400, "Insufficient points");

    const discountAmount = Number((dto.points * Number(settings.redeemValue)).toFixed(2));
    const { account: updated } = await this.repo.applyLedger({
      customerId: dto.customerId,
      type: "REDEEM",
      source: dto.orderId ? "ORDER" : "MANUAL",
      signedPoints: -dto.points,
      redeemedDelta: dto.points,
      orderId: dto.orderId ?? null,
      reference: dto.orderId ?? null,
      note: `استبدال بخصم ${discountAmount}`,
      createdById: actor.id,
    });
    await this.audit("LOYALTY_POINTS_REDEEMED", actor, ctx, { customerId: dto.customerId, points: dto.points, discountAmount, orderId: dto.orderId ?? null });
    this.emit({
      type: "POINTS_REDEEMED",
      data: { customerId: dto.customerId, customerName: account.customer.name, points: dto.points, discountAmount },
    });
    return { discountAmount, pointsRedeemed: dto.points, balanceAfter: updated.currentPoints };
  }

  // ==================== Adjust / Bonus ====================

  async adjust(dto: AdjustDto, actor: AuthenticatedUser, ctx: RequestContext): Promise<AccountSummary> {
    const account = await this.repo.findAccountWithCustomer(dto.customerId);
    if (!account) await this.repo.getOrCreateAccount(dto.customerId);
    const { account: updated } = await this.repo.applyLedger({
      customerId: dto.customerId,
      type: "ADJUST",
      source: "MANUAL",
      signedPoints: dto.points,
      lifetimeDelta: dto.points > 0 ? dto.points : 0,
      note: dto.reason,
      createdById: actor.id,
    });
    await this.audit("LOYALTY_POINTS_ADJUSTED", actor, ctx, { customerId: dto.customerId, points: dto.points, reason: dto.reason });
    await this.reevaluate(dto.customerId);
    void updated;
    return this.getSummary(dto.customerId);
  }

  async grantBonus(dto: BonusDto, actor: AuthenticatedUser, ctx: RequestContext): Promise<AccountSummary> {
    const settings = await this.repo.getOrCreateSettings();
    const defaults: Record<string, number> = {
      WELCOME: settings.welcomeBonus,
      BIRTHDAY: settings.birthdayBonus,
      REFERRAL: settings.referralBonus,
      BONUS: 0,
    };
    const points = dto.points ?? defaults[dto.type] ?? 0;
    if (points <= 0) throw new ApiError(400, "Bonus points must be positive (set in settings or provide explicitly)");

    const account = await this.repo.findAccountWithCustomer(dto.customerId);
    const { account: updated } = await this.repo.applyLedger({
      customerId: dto.customerId,
      type: dto.type,
      source: dto.type === "REFERRAL" ? "REFERRAL" : "CAMPAIGN",
      signedPoints: points,
      lifetimeDelta: points,
      note: dto.note ?? `مكافأة ${dto.type}`,
      createdById: actor.id,
    });
    await this.audit("LOYALTY_POINTS_EARNED", actor, ctx, { customerId: dto.customerId, type: dto.type, points });
    this.emit({
      type: "POINTS_EARNED",
      data: { customerId: dto.customerId, customerName: account?.customer.name ?? dto.customerId, points, balance: updated.currentPoints },
    });
    await this.membership.reevaluateForCustomer(dto.customerId, updated.lifetimePoints, account?.customer.name ?? dto.customerId);
    return this.getSummary(dto.customerId);
  }

  // ==================== Expire (batch job endpoint) ====================

  async expirePoints(actor: AuthenticatedUser, ctx: RequestContext): Promise<{ expiredTransactions: number; expiredPoints: number }> {
    const due = await this.repo.findExpirablePoints(new Date(), MAX_EXPIRE_BATCH);
    let expiredPoints = 0;
    const affected = new Map<string, { name: string; points: number }>();

    for (const tx of due) {
      const account = await this.repo.getOrCreateAccount(tx.customerId);
      const expireAmt = Math.min(tx.points, account.currentPoints);
      if (expireAmt > 0) {
        await this.repo.applyLedger({
          customerId: tx.customerId,
          type: "EXPIRE",
          source: "SYSTEM",
          signedPoints: -expireAmt,
          expiredDelta: expireAmt,
          note: "انتهاء صلاحية نقاط",
          reference: tx.reference,
        });
        expiredPoints += expireAmt;
        const cur = affected.get(tx.customerId) ?? { name: "", points: 0 };
        affected.set(tx.customerId, { name: cur.name, points: cur.points + expireAmt });
      }
      await this.repo.markReversed(tx.id); // منع الانتهاء المزدوج
    }

    for (const [customerId, info] of affected) {
      const acc = await this.repo.findAccountWithCustomer(customerId);
      this.emit({ type: "POINTS_EXPIRED", data: { customerId, customerName: acc?.customer.name ?? customerId, points: info.points } });
    }
    if (due.length > 0) {
      await this.audit("LOYALTY_POINTS_EXPIRED", actor, ctx, { expiredTransactions: due.length, expiredPoints });
    }
    return { expiredTransactions: due.length, expiredPoints };
  }

  // ==================== Campaigns ====================

  listCampaigns(query: ListCampaignsQuery): Promise<ListCampaignsResult> {
    return this.repo.listCampaigns(query);
  }
  async createCampaign(dto: CreateCampaignDto, actor: AuthenticatedUser, ctx: RequestContext): Promise<Campaign> {
    const campaign = await this.repo.createCampaign({
      name: dto.name,
      type: dto.type,
      points: dto.points,
      description: dto.description ?? null,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
      membershipLevels: dto.membershipLevels,
      createdById: actor.id,
    });
    await this.audit("CAMPAIGN_CREATED", actor, ctx, { campaignId: campaign.id, name: campaign.name });
    return campaign;
  }
  async updateCampaign(id: string, dto: UpdateCampaignDto, actor: AuthenticatedUser, ctx: RequestContext): Promise<Campaign> {
    const existing = await this.repo.findCampaign(id);
    if (!existing) throw new ApiError(404, "Campaign not found");
    const campaign = await this.repo.updateCampaign(id, dto);
    await this.audit("CAMPAIGN_UPDATED", actor, ctx, { campaignId: id, changes: dto });
    return campaign;
  }
  async deleteCampaign(id: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<void> {
    const existing = await this.repo.findCampaign(id);
    if (!existing) throw new ApiError(404, "Campaign not found");
    await this.repo.deleteCampaign(id);
    await this.audit("CAMPAIGN_UPDATED", actor, ctx, { campaignId: id, deleted: true });
  }

  // ==================== Helpers ====================

  private async reevaluate(customerId: string): Promise<void> {
    const acc = await this.repo.findAccountWithCustomer(customerId);
    if (acc) await this.membership.reevaluateForCustomer(customerId, acc.lifetimePoints, acc.customer.name);
  }

  private emit(event: Parameters<typeof notificationBus.emitNotification>[0]): void {
    try {
      notificationBus.emitNotification(event);
    } catch {
      // fire-and-forget
    }
  }

  private audit(action: AuditAction, actor: AuthenticatedUser, ctx: RequestContext, metadata: Prisma.InputJsonValue): Promise<unknown> {
    return this.repo.createAuditLog({ action, userId: actor.id, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, metadata });
  }
}
