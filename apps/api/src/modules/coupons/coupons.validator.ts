import { CouponType, MembershipLevel } from "@prisma/client";
import { z } from "zod";
import {
  COUPON_SORTABLE_FIELDS,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  SORT_ORDERS,
} from "./coupons.constants.js";

export const couponIdParamSchema = z.object({ id: z.cuid("Invalid coupon id") });

const idArray = z.array(z.string().trim().min(1)).max(200);

export const createCouponSchema = z.object({
  code: z.string().trim().min(2).max(40).toUpperCase(),
  description: z.string().trim().max(300).nullish(),
  type: z.enum(CouponType).default("PERCENTAGE"),
  value: z.coerce.number().min(0).max(1_000_000),
  maxDiscount: z.coerce.number().min(0).nullish(),
  minOrder: z.coerce.number().min(0).default(0),
  startDate: z.coerce.date().nullish(),
  endDate: z.coerce.date().nullish(),
  usageLimit: z.coerce.number().int().min(1).nullish(),
  usagePerCustomer: z.coerce.number().int().min(1).nullish(),
  allowedCategories: idArray.default([]),
  allowedServices: idArray.default([]),
  allowedCustomers: idArray.default([]),
  membershipLevels: z.array(z.enum(MembershipLevel)).default([]),
});

export const updateCouponSchema = z
  .object({
    description: z.string().trim().max(300).nullable(),
    type: z.enum(CouponType),
    value: z.coerce.number().min(0).max(1_000_000),
    maxDiscount: z.coerce.number().min(0).nullable(),
    minOrder: z.coerce.number().min(0),
    startDate: z.coerce.date().nullable(),
    endDate: z.coerce.date().nullable(),
    usageLimit: z.coerce.number().int().min(1).nullable(),
    usagePerCustomer: z.coerce.number().int().min(1).nullable(),
    allowedCategories: idArray,
    allowedServices: idArray,
    allowedCustomers: idArray,
    membershipLevels: z.array(z.enum(MembershipLevel)),
    isActive: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "لا توجد حقول للتعديل." });

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1).max(40),
  customerId: z.cuid().optional(),
  orderSubtotal: z.coerce.number().min(0),
  serviceIds: idArray.optional(),
  categoryIds: idArray.optional(),
});

export const redeemCouponSchema = z.object({
  code: z.string().trim().min(1).max(40),
  customerId: z.cuid().optional(),
  orderId: z.string().trim().max(60).optional(),
  orderSubtotal: z.coerce.number().min(0),
  serviceIds: idArray.optional(),
  categoryIds: idArray.optional(),
});

export const listCouponsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  type: z.enum(CouponType).optional(),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  sortBy: z.enum(COUPON_SORTABLE_FIELDS).default("createdAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});
