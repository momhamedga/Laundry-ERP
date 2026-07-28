import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { CouponsController } from "./coupons.controller.js";
import {
  createCouponSchema,
  redeemCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
} from "./coupons.validator.js";

/**
 * مسارات الكوبونات - /api/v1/coupons
 * coupon:view قراءة/تحقّق، coupon:manage إنشاء/تعديل/استخدام
 */
export function createCouponsRouter(controller: CouponsController): Router {
  const router = Router();
  router.use(authenticate);

  router.get("/", requirePermission("coupon:view"), controller.list);
  router.get("/stats", requirePermission("coupon:view"), controller.stats);
  router.post("/validate", requirePermission("coupon:view"), validateBody(validateCouponSchema), controller.validate);
  router.post("/", requirePermission("coupon:manage"), validateBody(createCouponSchema), controller.create);
  router.post("/redeem", requirePermission("coupon:manage"), validateBody(redeemCouponSchema), controller.redeem);
  router.get("/:id", requirePermission("coupon:view"), controller.getById);
  router.patch("/:id", requirePermission("coupon:manage"), validateBody(updateCouponSchema), controller.update);
  router.delete("/:id", requirePermission("coupon:manage"), controller.remove);

  return router;
}
