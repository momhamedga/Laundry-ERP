import type {
  AuditAction,
  Coupon,
  CouponRedemption,
  MembershipLevel,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import type { ListCouponsQuery } from "./coupons.dto.js";
import type { ListCouponsResult } from "./coupons.types.js";

export class CouponsRepository {
  constructor(private readonly db: PrismaClient) {}

  findByCode(code: string): Promise<Coupon | null> {
    return this.db.coupon.findUnique({ where: { code } });
  }
  findById(id: string): Promise<Coupon | null> {
    return this.db.coupon.findUnique({ where: { id } });
  }
  create(data: Prisma.CouponUncheckedCreateInput): Promise<Coupon> {
    return this.db.coupon.create({ data });
  }
  update(id: string, data: Prisma.CouponUpdateInput): Promise<Coupon> {
    return this.db.coupon.update({ where: { id }, data });
  }
  delete(id: string): Promise<Coupon> {
    return this.db.coupon.delete({ where: { id } });
  }

  async list(query: ListCouponsQuery): Promise<ListCouponsResult> {
    const where: Prisma.CouponWhereInput = {};
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }
    if (query.type) where.type = query.type;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    const skip = (query.page - 1) * query.limit;
    const [coupons, total] = await this.db.$transaction([
      this.db.coupon.findMany({ where, orderBy: { [query.sortBy]: query.sortOrder }, skip, take: query.limit }),
      this.db.coupon.count({ where }),
    ]);
    return { coupons, meta: this.meta(query.page, query.limit, total) };
  }

  countRedemptionsByCustomer(couponId: string, customerId: string): Promise<number> {
    return this.db.couponRedemption.count({ where: { couponId, customerId, reversed: false } });
  }

  /** تسجيل استخدام + زيادة العدّاد في معاملة واحدة */
  redeem(entry: {
    couponId: string;
    customerId: string | null;
    orderId: string | null;
    discountAmount: number;
    reference: string | null;
  }): Promise<CouponRedemption> {
    return this.db.$transaction(async (tx) => {
      const redemption = await tx.couponRedemption.create({ data: entry });
      await tx.coupon.update({ where: { id: entry.couponId }, data: { usedCount: { increment: 1 } } });
      return redemption;
    });
  }

  findActiveRedemptionsByOrder(orderId: string): Promise<CouponRedemption[]> {
    return this.db.couponRedemption.findMany({ where: { orderId, reversed: false } });
  }

  reverseRedemption(id: string, couponId: string): Promise<unknown> {
    return this.db.$transaction([
      this.db.couponRedemption.update({ where: { id }, data: { reversed: true } }),
      this.db.coupon.update({ where: { id: couponId }, data: { usedCount: { decrement: 1 } } }),
    ]);
  }

  /** مستوى عضوية العميل (من حساب الولاء) - قراءة عابرة للوحدات */
  async customerLevel(customerId: string): Promise<MembershipLevel | null> {
    const acc = await this.db.loyaltyAccount.findUnique({
      where: { customerId },
      select: { membershipLevel: true },
    });
    return acc?.membershipLevel ?? null;
  }

  async getStats() {
    const [totalCoupons, activeCoupons, agg] = await Promise.all([
      this.db.coupon.count(),
      this.db.coupon.count({ where: { isActive: true } }),
      this.db.couponRedemption.aggregate({ where: { reversed: false }, _count: { _all: true }, _sum: { discountAmount: true } }),
    ]);
    return {
      totalCoupons,
      activeCoupons,
      totalRedemptions: agg._count._all,
      totalDiscountGiven: agg._sum.discountAmount ? Number(agg._sum.discountAmount) : 0,
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

  private meta(page: number, limit: number, total: number) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
  }
}
