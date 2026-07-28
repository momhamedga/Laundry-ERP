import type { Coupon } from "@prisma/client";

export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ListCouponsResult {
  coupons: Coupon[];
  meta: PaginationMeta;
}

/** نتيجة التحقّق من كوبون */
export interface CouponValidation {
  valid: boolean;
  discount: number;
  reason?: string;
  coupon?: { id: string; code: string; type: string };
}

export interface RedeemResult {
  discount: number;
  couponCode: string;
  redemptionId: string;
}

export interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
}

export type { Coupon };
