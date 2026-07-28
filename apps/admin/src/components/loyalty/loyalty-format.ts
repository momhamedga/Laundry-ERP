import type { CouponType, LoyaltyTxType, MembershipLevel } from "@/types/loyalty";

export const LEVEL_LABELS: Record<MembershipLevel, string> = {
  BRONZE: "برونزي",
  SILVER: "فضي",
  GOLD: "ذهبي",
  PLATINUM: "بلاتيني",
  DIAMOND: "ماسي",
};

export const LEVEL_BADGE: Record<MembershipLevel, "outline" | "secondary" | "default"> = {
  BRONZE: "outline",
  SILVER: "secondary",
  GOLD: "default",
  PLATINUM: "default",
  DIAMOND: "default",
};

export const TX_TYPE_LABELS: Record<LoyaltyTxType, string> = {
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

export const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  FIXED: "مبلغ ثابت",
  PERCENTAGE: "نسبة",
  FREE_SERVICE: "خدمة مجانية",
  FREE_DELIVERY: "توصيل مجاني",
  GIFT: "هدية",
  REFERRAL: "إحالة",
  BIRTHDAY: "ميلاد",
};
