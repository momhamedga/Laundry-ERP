import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { CategoryController } from "./category.controller.js";
import {
  categoryStatusSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./category.validator.js";

/**
 * مسارات تصنيفات الخدمات - /api/v1/service-categories
 * الصلاحيات:
 * - services:read   → ADMIN, MANAGER, CASHIER
 * - services:manage → ADMIN, MANAGER
 */
export function createCategoryRouter(controller: CategoryController): Router {
  const router = Router();

  router.use(authenticate);

  // Collection
  router.get("/", requirePermission("services:read"), controller.list);
  router.post(
    "/",
    requirePermission("services:manage"),
    validateBody(createCategorySchema),
    controller.create,
  );

  // Item
  router.get("/:id", requirePermission("services:read"), controller.getById);
  router.patch(
    "/:id",
    requirePermission("services:manage"),
    validateBody(updateCategorySchema),
    controller.update,
  );
  router.patch(
    "/:id/status",
    requirePermission("services:manage"),
    validateBody(categoryStatusSchema),
    controller.changeStatus,
  );
  router.delete("/:id", requirePermission("services:manage"), controller.remove);

  return router;
}
