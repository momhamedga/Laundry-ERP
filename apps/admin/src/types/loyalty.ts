import type { PaginationMeta } from "@/types";

/** أنواع الولاء/الكوبونات/العضوية (Phase 9) - مطابقة لـ apps/api/src/modules/* */

export type MembershipLevel = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";
export type LoyaltyTxType =
  | "EARN"
  | "REDEEM"
  | "REVERSE"
  | "EXPIRE"
  | "ADJUST"
  | "BONUS"
  | "WELCOME"
  | "BIRTHDAY"
  | "REFERRAL";
export type LoyaltyEarnMode = "FIXED_PER_ORDER" | "PERCENTAGE";
export type CouponType =
  | "FIXED"
  | "PERCENTAGE"
  | "FREE_SERVICE"
  | "FREE_DELIVERY"
  | "GIFT"
  | "REFERRAL"
  | "BIRTHDAY";
export type CampaignType = "BONUS" | "WELCOME" | "BIRTHDAY" | "REFERRAL";

// ==================== Loyalty ====================

export interface LoyaltyAccountRow {
  id: string;
  currentPoints: number;
  lifetimePoints: number;
  redeemedPoints: number;
  expiredPoints: number;
  membershipLevel: MembershipLevel;
  levelSince: string;
  customerId: string;
  customer: { id: string; name: string; phone: string };
}
export interface AccountsResult {
  accounts: LoyaltyAccountRow[];
  meta: PaginationMeta;
}
export interface AccountSummary {
  customerId: string;
  customerName: string;
  currentPoints: number;
  lifetimePoints: number;
  redeemedPoints: number;
  expiredPoints: number;
  pendingPoints: number;
  availablePoints: number;
  membershipLevel: MembershipLevel;
  levelSince: string;
}
export interface LoyaltyTxRow {
  id: string;
  type: LoyaltyTxType;
  source: string;
  points: number;
  balanceAfter: number;
  reference: string | null;
  note: string | null;
  createdAt: string;
  customer: { id: string; name: string };
}
export interface HistoryResult {
  transactions: LoyaltyTxRow[];
  meta: PaginationMeta;
}
export interface LoyaltyStats {
  totalAccounts: number;
  totalCurrentPoints: number;
  totalLifetimePoints: number;
  totalRedeemedPoints: number;
  totalExpiredPoints: number;
}
export interface LoyaltySettings {
  id: string;
  earnMode: LoyaltyEarnMode;
  pointsPerCurrency: string;
  minOrderForPoints: string;
  maxPointsPerOrder: number | null;
  redeemValue: string;
  minPointsToRedeem: number;
  pointExpiryDays: number | null;
  welcomeBonus: number;
  birthdayBonus: number;
  referralBonus: number;
}
export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  points: number;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  membershipLevels: MembershipLevel[];
  isActive: boolean;
  createdAt: string;
}
export interface CampaignsResult {
  campaigns: Campaign[];
  meta: PaginationMeta;
}

export interface ListAccountsParams {
  page?: number;
  limit?: number;
  search?: string;
  level?: MembershipLevel;
  sortBy?: "currentPoints" | "lifetimePoints" | "createdAt";
  sortOrder?: "asc" | "desc";
}
export interface HistoryParams {
  page?: number;
  limit?: number;
  customerId?: string;
  type?: LoyaltyTxType;
}

// ==================== Coupons ====================

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: CouponType;
  value: string;
  maxDiscount: string | null;
  minOrder: string;
  startDate: string | null;
  endDate: string | null;
  usageLimit: number | null;
  usagePerCustomer: number | null;
  usedCount: number;
  allowedCategories: string[];
  allowedServices: string[];
  allowedCustomers: string[];
  membershipLevels: MembershipLevel[];
  isActive: boolean;
  createdAt: string;
}
export interface CouponsResult {
  coupons: Coupon[];
  meta: PaginationMeta;
}
export interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
}
export interface CreateCouponInput {
  code: string;
  description?: string | null;
  type: CouponType;
  value: number;
  maxDiscount?: number | null;
  minOrder?: number;
  startDate?: string | null;
  endDate?: string | null;
  usageLimit?: number | null;
  usagePerCustomer?: number | null;
  membershipLevels?: MembershipLevel[];
}
export interface ListCouponsParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: CouponType;
  isActive?: boolean;
}

// ==================== Membership ====================

export interface MembershipTier {
  id: string;
  level: MembershipLevel;
  minLifetimePoints: number;
  discountPercent: string;
  extraPointsPercent: string;
  priority: boolean;
  freeService: boolean;
  benefits: string | null;
  isActive: boolean;
  sortOrder: number;
}
export interface MembershipDistributionRow {
  level: MembershipLevel;
  count: number;
}
export interface UpdateTierInput {
  minLifetimePoints?: number;
  discountPercent?: number;
  extraPointsPercent?: number;
  priority?: boolean;
  freeService?: boolean;
  benefits?: string | null;
  isActive?: boolean;
}
