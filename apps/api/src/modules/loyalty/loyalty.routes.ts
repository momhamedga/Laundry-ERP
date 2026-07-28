import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { LoyaltyController } from "./loyalty.controller.js";
import {
  adjustSchema,
  bonusSchema,
  createCampaignSchema,
  redeemSchema,
  updateCampaignSchema,
  updateSettingsSchema,
} from "./loyalty.validator.js";

/**
 * مسارات الولاء - /api/v1/loyalty
 * loyalty:view قراءة/quote، loyalty:manage عمليات النقاط والحملات والإعدادات
 */
export function createLoyaltyRouter(controller: LoyaltyController): Router {
  const router = Router();
  router.use(authenticate);

  // Read
  router.get("/accounts", requirePermission("loyalty:view"), controller.accounts);
  router.get("/stats", requirePermission("loyalty:view"), controller.stats);
  router.get("/history", requirePermission("loyalty:view"), controller.history);
  router.get("/settings", requirePermission("loyalty:view"), controller.getSettings);
  router.get("/redeem/quote", requirePermission("loyalty:view"), controller.redeemQuote);

  // Campaigns
  router.get("/campaigns", requirePermission("loyalty:view"), controller.listCampaigns);
  router.post("/campaigns", requirePermission("loyalty:manage"), validateBody(createCampaignSchema), controller.createCampaign);
  router.patch("/campaigns/:id", requirePermission("loyalty:manage"), validateBody(updateCampaignSchema), controller.updateCampaign);
  router.delete("/campaigns/:id", requirePermission("loyalty:manage"), controller.deleteCampaign);

  // Points operations
  router.put("/settings", requirePermission("loyalty:manage"), validateBody(updateSettingsSchema), controller.updateSettings);
  router.post("/redeem", requirePermission("loyalty:manage"), validateBody(redeemSchema), controller.redeem);
  router.post("/adjust", requirePermission("loyalty:manage"), validateBody(adjustSchema), controller.adjust);
  router.post("/bonus", requirePermission("loyalty:manage"), validateBody(bonusSchema), controller.bonus);
  router.post("/expire", requirePermission("loyalty:manage"), controller.expire);

  // Per-customer (بعد الثابتة)
  router.get("/accounts/:id", requirePermission("loyalty:view"), controller.summary);

  return router;
}
