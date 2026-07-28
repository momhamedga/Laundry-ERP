import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { SettingsController } from "./settings.controller.js";
import { updateSettingsSchema } from "./settings.validator.js";

/**
 * مسارات الإعدادات - /api/v1/settings
 * الصلاحيات:
 * - القراءة → أي مستخدم مسجل (عملة/لغة/مظهر/RTL تلزم عرض الواجهة لأي أحد)
 * - settings:manage → ADMIN فقط (الصلاحية كانت موجودة مسبقاً بلا Route يستخدمها)
 */
export function createSettingsRouter(controller: SettingsController): Router {
  const router = Router();

  router.use(authenticate);
  router.get("/", controller.get);
  router.put(
    "/",
    requirePermission("settings:manage"),
    validateBody(updateSettingsSchema),
    controller.update,
  );

  return router;
}
