import { Router } from "express";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { LeavesController } from "./leaves.controller.js";
import { createLeaveSchema, reviewLeaveSchema, upsertLeaveBalanceSchema } from "./leaves.validator.js";

/** مسارات الإجازات - /api/v1/hr/leaves */
export function createLeavesRouter(controller: LeavesController): Router {
  const router = Router();

  router.get("/", requirePermission("leave:view"), controller.list);
  router.post("/", requirePermission("leave:manage"), validateBody(createLeaveSchema), controller.create);
  router.post("/balances", requirePermission("leave:manage"), validateBody(upsertLeaveBalanceSchema), controller.setBalance);
  router.get("/balances/:id", requirePermission("leave:view"), controller.balances);
  router.post("/:id/review", requirePermission("leave:approve"), validateBody(reviewLeaveSchema), controller.review);
  router.post("/:id/cancel", requirePermission("leave:manage"), controller.cancel);

  return router;
}
