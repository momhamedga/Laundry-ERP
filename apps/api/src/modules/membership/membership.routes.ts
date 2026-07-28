import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { MembershipController } from "./membership.controller.js";
import { manualLevelSchema, updateTierSchema } from "./membership.validator.js";

/** مسارات العضوية - /api/v1/membership */
export function createMembershipRouter(controller: MembershipController): Router {
  const router = Router();
  router.use(authenticate);

  router.get("/tiers", requirePermission("membership:view"), controller.listTiers);
  router.get("/distribution", requirePermission("membership:view"), controller.distribution);
  router.patch("/tiers/:level", requirePermission("membership:manage"), validateBody(updateTierSchema), controller.updateTier);
  router.post("/set-level", requirePermission("membership:manage"), validateBody(manualLevelSchema), controller.setLevel);

  return router;
}
