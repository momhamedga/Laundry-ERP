import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { CustomersController } from "./customers.controller.js";
import {
  createCustomerSchema,
  mergeCustomersSchema,
  updateCustomerSchema,
  updateNotesSchema,
} from "./customers.validator.js";

/**
 * مسارات العملاء - /api/v1/customers
 * الصلاحيات:
 * - customers:read   → ADMIN, MANAGER, CASHIER, DELIVERY
 * - customers:manage → ADMIN, MANAGER, CASHIER
 * - delete/restore/merge → ADMIN, MANAGER فقط (عمليات حساسة)
 */
export function createCustomersRouter(controller: CustomersController): Router {
  const router = Router();

  router.use(authenticate);

  // Static routes قبل /:id حتى لا يلتقطها الـ param route
  router.get("/phone/:phone", requirePermission("customers:read"), controller.getByPhone);
  router.post(
    "/merge",
    requireRole("ADMIN", "MANAGER"),
    validateBody(mergeCustomersSchema),
    controller.merge,
  );

  // Collection
  router.get("/", requirePermission("customers:read"), controller.list);
  router.post(
    "/",
    requirePermission("customers:manage"),
    validateBody(createCustomerSchema),
    controller.create,
  );

  // Item
  router.get("/:id", requirePermission("customers:read"), controller.getById);
  router.patch(
    "/:id",
    requirePermission("customers:manage"),
    validateBody(updateCustomerSchema),
    controller.update,
  );
  router.patch(
    "/:id/notes",
    requirePermission("customers:manage"),
    validateBody(updateNotesSchema),
    controller.updateNotes,
  );
  router.delete("/:id", requireRole("ADMIN", "MANAGER"), controller.remove);
  router.patch("/:id/restore", requireRole("ADMIN", "MANAGER"), controller.restore);
  router.get("/:id/stats", requirePermission("customers:read"), controller.getStats);
  router.get("/:id/profile", requirePermission("customers:read"), controller.getProfile);

  return router;
}
