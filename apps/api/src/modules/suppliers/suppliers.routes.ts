import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { SuppliersController } from "./suppliers.controller.js";
import { createSupplierSchema, updateSupplierSchema } from "./suppliers.validator.js";

/**
 * مسارات الموردين - /api/v1/suppliers
 * supplier:view للقراءة، supplier:manage للتعديل (ADMIN/MANAGER)
 */
export function createSuppliersRouter(controller: SuppliersController): Router {
  const router = Router();

  router.use(authenticate);

  router.get("/", requirePermission("supplier:view"), controller.list);
  router.post(
    "/",
    requirePermission("supplier:manage"),
    validateBody(createSupplierSchema),
    controller.create,
  );
  router.get("/:id", requirePermission("supplier:view"), controller.getById);
  router.get("/:id/stats", requirePermission("supplier:view"), controller.getStats);
  router.patch(
    "/:id",
    requirePermission("supplier:manage"),
    validateBody(updateSupplierSchema),
    controller.update,
  );
  router.delete("/:id", requirePermission("supplier:manage"), controller.remove);
  router.patch("/:id/restore", requirePermission("supplier:manage"), controller.restore);

  return router;
}
