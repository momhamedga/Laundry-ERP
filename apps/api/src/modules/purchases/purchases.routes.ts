import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { PurchasesController } from "./purchases.controller.js";
import { createPurchaseSchema, updatePurchaseSchema } from "./purchases.validator.js";

/**
 * مسارات المشتريات - /api/v1/purchases
 * purchase:view قراءة، purchase:manage تعديل/استلام/إلغاء (ADMIN/MANAGER)
 */
export function createPurchasesRouter(controller: PurchasesController): Router {
  const router = Router();

  router.use(authenticate);

  router.get("/", requirePermission("purchase:view"), controller.list);
  router.post(
    "/",
    requirePermission("purchase:manage"),
    validateBody(createPurchaseSchema),
    controller.create,
  );
  router.get("/:id", requirePermission("purchase:view"), controller.getById);
  router.patch(
    "/:id",
    requirePermission("purchase:manage"),
    validateBody(updatePurchaseSchema),
    controller.update,
  );
  router.delete("/:id", requirePermission("purchase:manage"), controller.remove);
  router.post("/:id/receive", requirePermission("purchase:manage"), controller.receive);
  router.post("/:id/cancel", requirePermission("purchase:manage"), controller.cancel);

  return router;
}
