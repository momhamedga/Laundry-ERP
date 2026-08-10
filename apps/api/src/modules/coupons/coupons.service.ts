import type { AuditAction, Coupon, Prisma } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { RequestContext } from "../auth/auth.types.js";
import type { AuthenticatedUser } from "../auth/index.js";
import { notificationBus } from "../notifications/index.js";
import type {
  CreateCouponDto,
  ListCouponsQuery,
  RedeemCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from "./coupons.dto.js";
import type { CouponsRepository } from "./coupons.repository.js";
import type {
  CouponStats,
  CouponValidation,
  ListCouponsResult,
  RedeemResult,
} from "./coupons.types.js";

export class CouponsService {
  constructor(private readonly repo: CouponsRepository) {}

  // ==================== CRUD ====================

  list(query: ListCouponsQuery): Promise<ListCouponsResult> {
    return this.repo.list(query);
  }
  getStats(): Promise<CouponStats> {
    return this.repo.getStats();
  }
  async getById(id: string): Promise<Coupon> {
    const coupon = await this.repo.findById(id);
    if (!coupon) throw new ApiError(404, "الكوبون غير موجود.");
    return coupon;
  }

  async create(dto: CreateCouponDto, actor: AuthenticatedUser, ctx: RequestContext): Promise<Coupon> {
    const existing = await this.repo.findByCode(dto.code);
    if (existing) throw new ApiError(409, "كود الكوبون موجود بالفعل.");
    const coupon = await this.repo.create({
      code: dto.code,
      description: dto.description ?? null,
      type: dto.type,
      value: dto.value,
      maxDiscount: dto.maxDiscount ?? null,
      minOrder: dto.minOrder,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
      usageLimit: dto.usageLimit ?? null,
      usagePerCustomer: dto.usagePerCustomer ?? null,
      allowedCategories: dto.allowedCategories,
      allowedServices: dto.allowedServices,
      allowedCustomers: dto.allowedCustomers,
      membershipLevels: dto.membershipLevels,
      createdById: actor.id,
    });
    await this.audit("COUPON_CREATED", actor, ctx, { couponId: coupon.id, code: coupon.code });
    this.emit({ type: "COUPON_CREATED", data: { code: coupon.code, couponType: coupon.type } });
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto, actor: AuthenticatedUser, ctx: RequestContext): Promise<Coupon> {
    await this.getById(id);
    const coupon = await this.repo.update(id, dto);
    await this.audit("COUPON_UPDATED", actor, ctx, { couponId: id, changes: dto });
    return coupon;
  }

  async remove(id: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<void> {
    const coupon = await this.getById(id);
    await this.repo.delete(id);
    await this.audit("COUPON_DELETED", actor, ctx, { couponId: id, code: coupon.code });
  }

  // ==================== Validate (read-only quote) ====================

  async validate(dto: ValidateCouponDto): Promise<CouponValidation> {
    const coupon = await this.repo.findByCode(dto.code.toUpperCase());
    const fail = (reason: string): CouponValidation => ({ valid: false, discount: 0, reason });

    if (!coupon || !coupon.isActive) return fail("كوبون غير موجود أو غير مفعّل");

    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) return fail("لم يبدأ الكوبون بعد");
    if (coupon.endDate && now > coupon.endDate) return fail("انتهت صلاحية الكوبون");
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return fail("استُنفد حد استخدام الكوبون");
    if (Number(dto.orderSubtotal) < Number(coupon.minOrder)) return fail(`الحد الأدنى للطلب ${Number(coupon.minOrder)}`);

    if (dto.customerId) {
      if (coupon.usagePerCustomer != null) {
        const used = await this.repo.countRedemptionsByCustomer(coupon.id, dto.customerId);
        if (used >= coupon.usagePerCustomer) return fail("استخدمت هذا الكوبون بالحد الأقصى");
      }
      if (coupon.allowedCustomers.length > 0 && !coupon.allowedCustomers.includes(dto.customerId))
        return fail("الكوبون غير متاح لهذا العميل");
      if (coupon.membershipLevels.length > 0) {
        const level = await this.repo.customerLevel(dto.customerId);
        if (!level || !coupon.membershipLevels.includes(level))
          return fail("الكوبون مقصور على مستويات عضوية محدّدة");
      }
    } else if (coupon.allowedCustomers.length > 0 || coupon.membershipLevels.length > 0) {
      return fail("الكوبون يتطلب تحديد العميل");
    }

    if (coupon.allowedServices.length > 0) {
      const ids = dto.serviceIds ?? [];
      if (!ids.some((s) => coupon.allowedServices.includes(s))) return fail("الكوبون غير متاح لخدمات هذا الطلب");
    }
    if (coupon.allowedCategories.length > 0) {
      const ids = dto.categoryIds ?? [];
      if (!ids.some((c) => coupon.allowedCategories.includes(c))) return fail("الكوبون غير متاح لتصنيفات هذا الطلب");
    }

    const discount = this.computeDiscount(coupon, Number(dto.orderSubtotal));
    return { valid: true, discount, coupon: { id: coupon.id, code: coupon.code, type: coupon.type } };
  }

  private computeDiscount(coupon: Coupon, subtotal: number): number {
    let discount: number;
    switch (coupon.type) {
      case "PERCENTAGE":
        discount = (subtotal * Number(coupon.value)) / 100;
        if (coupon.maxDiscount != null) discount = Math.min(discount, Number(coupon.maxDiscount));
        break;
      case "FIXED":
      case "FREE_SERVICE":
      case "FREE_DELIVERY":
      case "GIFT":
      case "REFERRAL":
      case "BIRTHDAY":
        discount = Number(coupon.value);
        break;
    }
    return Number(Math.min(discount, subtotal).toFixed(2));
  }

  // ==================== Redeem (record usage) ====================

  async redeem(dto: RedeemCouponDto, actor: AuthenticatedUser, ctx: RequestContext): Promise<RedeemResult> {
    const validation = await this.validate({
      code: dto.code,
      customerId: dto.customerId,
      orderSubtotal: dto.orderSubtotal,
      serviceIds: dto.serviceIds,
      categoryIds: dto.categoryIds,
    });
    if (!validation.valid || !validation.coupon) throw new ApiError(400, validation.reason ?? "Coupon not valid");

    const redemption = await this.repo.redeem({
      couponId: validation.coupon.id,
      customerId: dto.customerId ?? null,
      orderId: dto.orderId ?? null,
      discountAmount: validation.discount,
      reference: dto.orderId ?? null,
    });
    await this.audit("COUPON_REDEEMED", actor, ctx, {
      couponId: validation.coupon.id,
      code: validation.coupon.code,
      discount: validation.discount,
      orderId: dto.orderId ?? null,
    });
    this.emit({
      type: "COUPON_USED",
      data: { code: validation.coupon.code, customerName: dto.customerId ?? "ضيف", discountAmount: validation.discount },
    });
    return { discount: validation.discount, couponCode: validation.coupon.code, redemptionId: redemption.id };
  }

  /** استعادة الكوبون عند إلغاء/استرداد الطلب (يُستدعى من تكامل الولاء عبر الـ bus) */
  async reverseByOrder(orderId: string): Promise<void> {
    const redemptions = await this.repo.findActiveRedemptionsByOrder(orderId);
    for (const r of redemptions) {
      await this.repo.reverseRedemption(r.id, r.couponId);
    }
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
