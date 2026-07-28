import type { z } from "zod";
import type {
  createCouponSchema,
  listCouponsQuerySchema,
  redeemCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
} from "./coupons.validator.js";

export type CreateCouponDto = z.infer<typeof createCouponSchema>;
export type UpdateCouponDto = z.infer<typeof updateCouponSchema>;
export type ValidateCouponDto = z.infer<typeof validateCouponSchema>;
export type RedeemCouponDto = z.infer<typeof redeemCouponSchema>;
export type ListCouponsQuery = z.infer<typeof listCouponsQuerySchema>;
