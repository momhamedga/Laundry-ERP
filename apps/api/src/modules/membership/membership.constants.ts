import type { MembershipLevel } from "@prisma/client";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** الترتيب التصاعدي للمستويات - يُحدّد الترقية/التخفيض */
export const LEVEL_ORDER: MembershipLevel[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];

/** التهيئة الافتراضية للمستويات - تُزرع عند أول وصول (نفس نمط getOrCreate) */
export const DEFAULT_TIERS: {
  level: MembershipLevel;
  minLifetimePoints: number;
  discountPercent: number;
  extraPointsPercent: number;
  priority: boolean;
  freeService: boolean;
  benefits: string;
  sortOrder: number;
}[] = [
  { level: "BRONZE", minLifetimePoints: 0, discountPercent: 0, extraPointsPercent: 0, priority: false, freeService: false, benefits: "المستوى الأساسي", sortOrder: 1 },
  { level: "SILVER", minLifetimePoints: 500, discountPercent: 5, extraPointsPercent: 5, priority: false, freeService: false, benefits: "خصم 5% + نقاط إضافية", sortOrder: 2 },
  { level: "GOLD", minLifetimePoints: 2000, discountPercent: 10, extraPointsPercent: 10, priority: true, freeService: false, benefits: "خصم 10% + أولوية", sortOrder: 3 },
  { level: "PLATINUM", minLifetimePoints: 5000, discountPercent: 15, extraPointsPercent: 15, priority: true, freeService: true, benefits: "خصم 15% + أولوية + خدمة مجانية", sortOrder: 4 },
  { level: "DIAMOND", minLifetimePoints: 10000, discountPercent: 20, extraPointsPercent: 20, priority: true, freeService: true, benefits: "خصم 20% + كل المزايا", sortOrder: 5 },
];
