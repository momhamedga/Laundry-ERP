import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { AdminController } from "./admin.controller.js";
import {
  copyPermissionsSchema,
  forceLogoutSchema,
  removeOverrideSchema,
  setOverrideSchema,
} from "./admin.validator.js";

/**
 * مسارات الإدارة/الأمان - /api/v1/admin
 * security:view قراءة (مركز الأمان/سجل الدخول/الجلسات/مصفوفة الصلاحيات)
 * security:manage عمليات (إنهاء جلسة/إخراج قسري)
 */
export function createAdminRouter(controller: AdminController): Router {
  const router = Router();
  router.use(authenticate);

  router.get("/security-center", requirePermission("security:view"), controller.securityCenter);
  router.get("/login-history", requirePermission("security:view"), controller.loginHistory);
  router.get("/permissions-matrix", requirePermission("security:view"), controller.permissionMatrix);
  router.get("/users/:userId/sessions", requirePermission("security:view"), controller.userSessions);

  router.post(
    "/force-logout",
    requirePermission("security:manage"),
    validateBody(forceLogoutSchema),
    controller.forceLogout,
  );
  router.delete("/sessions/:sessionId", requirePermission("security:manage"), controller.killSession);

  // Phase 9.6c - تجاوزات الصلاحيات لكل مستخدم (مصفوفة قابلة للتحرير على مستوى المستخدم)
  router.get("/users/:userId/permissions", requirePermission("security:view"), controller.userPermissions);
  router.put("/users/:userId/permissions", requirePermission("security:manage"), validateBody(setOverrideSchema), controller.setOverride);
  router.delete("/users/:userId/permissions", requirePermission("security:manage"), validateBody(removeOverrideSchema), controller.removeOverride);
  router.post("/users/:userId/permissions/copy", requirePermission("security:manage"), validateBody(copyPermissionsSchema), controller.copyPermissions);

  // Phase 9.6c - الانتحال (ADMIN فقط - يُفرض إضافياً بالخدمة). stop قبل :userId
  router.post("/impersonate/stop", controller.stopImpersonation);
  router.post("/impersonate/:userId", requirePermission("security:manage"), controller.impersonate);

  return router;
}
