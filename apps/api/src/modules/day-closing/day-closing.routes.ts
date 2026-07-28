import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { DayClosingController } from "./day-closing.controller.js";
import {
  cashMovementSchema,
  closeDaySchema,
  openDaySchema,
  reopenDaySchema,
} from "./day-closing.validator.js";

/**
 * مسارات إغلاق اليوم - /api/v1/day-closing
 * day:view قراءة | day:create فتح/حركة نقدية | day:close إغلاق | day:approve اعتماد
 * | day:reopen إعادة فتح (ADMIN فقط - يُفرض إضافياً بالخدمة)
 */
export function createDayClosingRouter(controller: DayClosingController): Router {
  const router = Router();
  router.use(authenticate);

  // Read
  router.get("/current", requirePermission("day:view"), controller.current);
  router.get("/dashboard", requirePermission("day:view"), controller.dashboard);
  router.get("/pre-close-check", requirePermission("day:view"), controller.preCloseCheck);
  router.get("/history", requirePermission("day:view"), controller.list);

  // Workflow
  router.post("/open", requirePermission("day:create"), validateBody(openDaySchema), controller.open);
  router.post("/close", requirePermission("day:close"), validateBody(closeDaySchema), controller.close);
  router.post(
    "/cash-movement",
    requirePermission("day:create"),
    validateBody(cashMovementSchema),
    controller.cashMovement,
  );
  router.post(
    "/:id/reopen",
    requirePermission("day:reopen"),
    validateBody(reopenDaySchema),
    controller.reopen,
  );
  router.post("/:id/approve", requirePermission("day:approve"), controller.approve);

  // Per-id (بعد الثابتة)
  router.get("/:id", requirePermission("day:view"), controller.getById);

  return router;
}
