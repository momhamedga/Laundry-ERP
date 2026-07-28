import type { MembershipLevel, MembershipTierConfig, Prisma } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { RequestContext } from "../auth/auth.types.js";
import type { AuthenticatedUser } from "../auth/index.js";
import { notificationBus } from "../notifications/index.js";
import { LEVEL_ORDER } from "./membership.constants.js";
import type { MembershipRepository } from "./membership.repository.js";
import type { MembershipDistributionRow, TierEvaluation } from "./membership.types.js";
import type { ManualLevelDto, UpdateTierDto } from "./membership.dto.js";

export class MembershipService {
  constructor(private readonly repo: MembershipRepository) {}

  listTiers(): Promise<MembershipTierConfig[]> {
    return this.repo.ensureTiers();
  }

  distribution(): Promise<MembershipDistributionRow[]> {
    return this.repo.distribution();
  }

  /** مزايا مستوى - يُستخدم من الولاء (نقاط إضافية) والكوبونات (خصم المستوى) */
  async getTierBenefits(level: MembershipLevel): Promise<MembershipTierConfig> {
    await this.repo.ensureTiers();
    const tier = await this.repo.findTierByLevel(level);
    if (!tier) throw new ApiError(404, "Tier config not found");
    return tier;
  }

  /** يحسب المستوى المستحق بناءً على نقاط العمر (أعلى مستوى نشط تتجاوز عتبته) */
  private computeLevel(tiers: MembershipTierConfig[], lifetimePoints: number): MembershipLevel {
    const eligible = tiers
      .filter((t) => t.isActive && lifetimePoints >= t.minLifetimePoints)
      .sort((a, b) => a.minLifetimePoints - b.minLifetimePoints);
    const top = eligible[eligible.length - 1];
    return top?.level ?? "BRONZE";
  }

  /**
   * إعادة تقييم مستوى العميل (Auto Upgrade/Downgrade) - يُستدعى من الولاء بعد أي
   * تغيّر بنقاط العمر. يُحدّث + يُطلق إشعار الترقية/التخفيض. بلا Audit للتلقائي
   * (لا فاعل بشري - AuditLog يتطلب userId).
   */
  async reevaluateForCustomer(
    customerId: string,
    lifetimePoints: number,
    customerName: string,
  ): Promise<TierEvaluation> {
    const [tiers, account] = await Promise.all([
      this.repo.ensureTiers(),
      this.repo.findAccountByCustomer(customerId),
    ]);
    const oldLevel = account?.membershipLevel ?? "BRONZE";
    const newLevel = this.computeLevel(tiers, lifetimePoints);
    if (newLevel === oldLevel) {
      return { changed: false, oldLevel, newLevel, direction: "NONE" };
    }
    await this.repo.updateAccountLevel(customerId, newLevel);
    const up = LEVEL_ORDER.indexOf(newLevel) > LEVEL_ORDER.indexOf(oldLevel);
    this.emit({
      type: up ? "MEMBERSHIP_UPGRADED" : "MEMBERSHIP_DOWNGRADED",
      data: { customerId, customerName, level: newLevel },
    });
    return { changed: true, oldLevel, newLevel, direction: up ? "UP" : "DOWN" };
  }

  /** ترقية/تخفيض يدوي صريح */
  async manualSetLevel(dto: ManualLevelDto, actor: AuthenticatedUser, ctx: RequestContext): Promise<TierEvaluation> {
    const account = await this.repo.findAccountByCustomer(dto.customerId);
    if (!account) throw new ApiError(404, "Customer has no loyalty account");
    const oldLevel = account.membershipLevel;
    if (oldLevel === dto.level) throw new ApiError(400, "Customer already at this level");
    await this.repo.updateAccountLevel(dto.customerId, dto.level);
    const up = LEVEL_ORDER.indexOf(dto.level) > LEVEL_ORDER.indexOf(oldLevel);

    await this.audit(up ? "MEMBERSHIP_UPGRADED" : "MEMBERSHIP_DOWNGRADED", actor, ctx, {
      customerId: dto.customerId,
      from: oldLevel,
      to: dto.level,
      manual: true,
    });
    this.emit({
      type: up ? "MEMBERSHIP_UPGRADED" : "MEMBERSHIP_DOWNGRADED",
      data: { customerId: dto.customerId, customerName: dto.customerId, level: dto.level },
    });
    return { changed: true, oldLevel, newLevel: dto.level, direction: up ? "UP" : "DOWN" };
  }

  async updateTier(
    level: MembershipLevel,
    dto: UpdateTierDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<MembershipTierConfig> {
    await this.repo.ensureTiers();
    const existing = await this.repo.findTierByLevel(level);
    if (!existing) throw new ApiError(404, "Tier not found");
    const tier = await this.repo.updateTier(level, dto);
    await this.audit("MEMBERSHIP_TIER_UPDATED", actor, ctx, { level, changes: dto });
    return tier;
  }

  private emit(event: Parameters<typeof notificationBus.emitNotification>[0]): void {
    try {
      notificationBus.emitNotification(event);
    } catch {
      // fire-and-forget
    }
  }

  private audit(
    action: "MEMBERSHIP_UPGRADED" | "MEMBERSHIP_DOWNGRADED" | "MEMBERSHIP_TIER_UPDATED",
    actor: AuthenticatedUser,
    ctx: RequestContext,
    metadata: Prisma.InputJsonValue,
  ): Promise<unknown> {
    return this.repo.createAuditLog({
      action,
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata,
    });
  }
}
