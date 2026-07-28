import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { ServicesController } from "./services.controller.js";
import {
  createServiceSchema,
  serviceStatusSchema,
  updateServiceSchema,
} from "./services.validator.js";

/**
 * مسارات الخدمات - /api/v1/services
 * الصلاحيات:
 * - services:read   → ADMIN, MANAGER, CASHIER
 * - services:manage → ADMIN, MANAGER
 */
export function createServicesRouter(controller: ServicesController): Router {
  const router = Router();

  router.use(authenticate);

  // Collection
  router.get("/", requirePermission("services:read"), controller.list);
  router.post(
    "/",
    requirePermission("services:manage"),
    validateBody(createServiceSchema),
    controller.create,
  );

  // Item
  router.get("/:id", requirePermission("services:read"), controller.getById);
  router.patch(
    "/:id",
    requirePermission("services:manage"),
    validateBody(updateServiceSchema),
    controller.update,
  );
  router.patch(
    "/:id/status",
    requirePermission("services:manage"),
    validateBody(serviceStatusSchema),
    controller.changeStatus,
  );
  router.delete("/:id", requirePermission("services:manage"), controller.remove);
  router.patch("/:id/restore", requirePermission("services:manage"), controller.restore);
  router.post("/:id/image", requirePermission("services:manage"), controller.uploadImage);

  return router;
}
