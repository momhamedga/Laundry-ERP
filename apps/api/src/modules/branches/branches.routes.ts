import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { BranchesController } from "./branches.controller.js";
import {
  branchStatusSchema,
  createBranchSchema,
  updateBranchSchema,
} from "./branches.validator.js";

/**
 * مسارات الفروع - /api/v1/branches
 * الصلاحيات:
 * - القراءة → أي مستخدم مسجل (اختيار الفرع مطلوب في شاشات عدة)
 * - branches:manage → ADMIN فقط
 */
export function createBranchesRouter(controller: BranchesController): Router {
  const router = Router();

  router.use(authenticate);

  // Collection
  router.get("/", controller.list);
  router.post(
    "/",
    requirePermission("branches:manage"),
    validateBody(createBranchSchema),
    controller.create,
  );

  // Item
  router.get("/:id", controller.getById);
  router.patch(
    "/:id",
    requirePermission("branches:manage"),
    validateBody(updateBranchSchema),
    controller.update,
  );
  router.patch(
    "/:id/status",
    requirePermission("branches:manage"),
    validateBody(branchStatusSchema),
    controller.changeStatus,
  );
  router.delete("/:id", requirePermission("branches:manage"), controller.remove);

  return router;
}
