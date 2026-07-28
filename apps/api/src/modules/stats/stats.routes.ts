import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import type { StatsController } from "./stats.controller.js";

/**
 * مسارات الإحصائيات - /api/v1/stats
 * reports:view → ADMIN, MANAGER
 */
export function createStatsRouter(controller: StatsController): Router {
  const router = Router();

  router.use(authenticate);
  router.get("/dashboard", requirePermission("reports:view"), controller.dashboard);

  return router;
}
