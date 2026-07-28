import { CampaignType, LoyaltyEarnMode, LoyaltyTxType, MembershipLevel } from "@prisma/client";
import { z } from "zod";
import {
  ACCOUNT_SORTABLE_FIELDS,
  CAMPAIGN_SORTABLE_FIELDS,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  HISTORY_SORTABLE_FIELDS,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  SORT_ORDERS,
} from "./loyalty.constants.js";

export const customerIdParamSchema = z.object({ id: z.cuid("Invalid customer id") });
export const campaignIdParamSchema = z.object({ id: z.cuid("Invalid campaign id") });

// ==================== Points operations ====================

export const adjustSchema = z.object({
  customerId: z.cuid(),
  points: z.coerce.number().int().refine((v) => v !== 0, "Points cannot be zero"),
  reason: z.string().trim().min(2).max(300),
});

export const redeemSchema = z.object({
  customerId: z.cuid(),
  points: z.coerce.number().int().positive(),
  orderId: z.string().trim().max(60).optional(),
});

export const redeemQuerySchema = z.object({
  customerId: z.cuid(),
  points: z.coerce.number().int().positive(),
});

export const bonusSchema = z.object({
  customerId: z.cuid(),
  type: z.enum(["WELCOME", "BIRTHDAY", "REFERRAL", "BONUS"]),
  /** تجاوز نقاط الإعداد الافتراضي (اختياري) */
  points: z.coerce.number().int().positive().optional(),
  note: z.string().trim().max(300).optional(),
});

// ==================== Settings ====================

export const updateSettingsSchema = z
  .object({
    earnMode: z.enum(LoyaltyEarnMode),
    pointsPerCurrency: z.coerce.number().min(0),
    minOrderForPoints: z.coerce.number().min(0),
    maxPointsPerOrder: z.coerce.number().int().min(0).nullable(),
    redeemValue: z.coerce.number().min(0),
    minPointsToRedeem: z.coerce.number().int().min(0),
    pointExpiryDays: z.coerce.number().int().min(1).max(3650).nullable(),
    welcomeBonus: z.coerce.number().int().min(0),
    birthdayBonus: z.coerce.number().int().min(0),
    referralBonus: z.coerce.number().int().min(0),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

// ==================== Campaigns ====================

export const createCampaignSchema = z.object({
  name: z.string().trim().min(2).max(150),
  type: z.enum(CampaignType).default("BONUS"),
  points: z.coerce.number().int().min(0).default(0),
  description: z.string().trim().max(500).nullish(),
  startDate: z.coerce.date().nullish(),
  endDate: z.coerce.date().nullish(),
  membershipLevels: z.array(z.enum(MembershipLevel)).default([]),
});

export const updateCampaignSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    points: z.coerce.number().int().min(0),
    description: z.string().trim().max(500).nullable(),
    startDate: z.coerce.date().nullable(),
    endDate: z.coerce.date().nullable(),
    membershipLevels: z.array(z.enum(MembershipLevel)),
    isActive: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

// ==================== Queries ====================

export const listAccountsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  level: z.enum(MembershipLevel).optional(),
  sortBy: z.enum(ACCOUNT_SORTABLE_FIELDS).default("lifetimePoints"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  customerId: z.cuid().optional(),
  type: z.enum(LoyaltyTxType).optional(),
  sortBy: z.enum(HISTORY_SORTABLE_FIELDS).default("createdAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});

export const listCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  sortBy: z.enum(CAMPAIGN_SORTABLE_FIELDS).default("createdAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});
