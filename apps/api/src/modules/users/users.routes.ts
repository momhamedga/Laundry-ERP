import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { UsersController } from "./users.controller.js";
import {
  adminResetPasswordSchema,
  assignRoleSchema,
  changeStatusSchema,
  createUserSchema,
  updateProfileSchema,
  updateUserSchema,
} from "./users.validator.js";

/**
 * مسارات إدارة المستخدمين - /api/v1/users
 * كل المسارات محمية بـ authenticate + صلاحيات دقيقة:
 * - users:read   → ADMIN, MANAGER
 * - users:manage → ADMIN فقط
 * - profile      → أي مستخدم مسجل (بياناته فقط)
 */
export function createUsersRouter(controller: UsersController): Router {
  const router = Router();

  router.use(authenticate);

  // Profile (self) - قبل /:id حتى لا يلتقطها الـ param route
  router.get("/profile", controller.getProfile);
  router.patch("/profile", validateBody(updateProfileSchema), controller.updateProfile);
  router.post("/profile/avatar", controller.uploadAvatar);

  // Collection
  router.get("/", requirePermission("users:read"), controller.list);
  router.post(
    "/",
    requirePermission("users:manage"),
    validateBody(createUserSchema),
    controller.create,
  );

  // Item
  router.get("/:id", requirePermission("users:read"), controller.getById);
  router.patch(
    "/:id",
    requirePermission("users:manage"),
    validateBody(updateUserSchema),
    controller.update,
  );
  router.delete("/:id", requirePermission("users:manage"), controller.remove);
  router.patch(
    "/:id/status",
    requirePermission("users:manage"),
    validateBody(changeStatusSchema),
    controller.changeStatus,
  );
  router.patch(
    "/:id/role",
    requirePermission("users:manage"),
    validateBody(assignRoleSchema),
    controller.assignRole,
  );
  router.post(
    "/:id/reset-password",
    requirePermission("users:manage"),
    validateBody(adminResetPasswordSchema),
    controller.adminResetPassword,
  );
  router.get("/:id/activity", requirePermission("audit:read"), controller.getActivity);

  return router;
}
