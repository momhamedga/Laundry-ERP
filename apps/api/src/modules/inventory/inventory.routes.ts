import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { InventoryController } from "./inventory.controller.js";
import {
  adjustSchema,
  createItemSchema,
  createMovementSchema,
  stockCountSchema,
  transferSchema,
  updateItemSchema,
} from "./inventory.validator.js";

/**
 * مسارات المخزون - /api/v1/inventory
 * inventory:view قراءة، inventory:create/update حركات، inventory:manage عمليات حساسة.
 * المسارات الثابتة قبل /items/:id حتى لا يلتقطها param route.
 */
export function createInventoryRouter(controller: InventoryController): Router {
  const router = Router();

  router.use(authenticate);

  // ---- Dashboard / global lists ----
  router.get("/stats", requirePermission("inventory:view"), controller.stats);
  router.get("/movements", requirePermission("inventory:view"), controller.listMovements);
  router.get("/alerts", requirePermission("inventory:view"), controller.listAlerts);
  router.patch("/alerts/:id/resolve", requirePermission("inventory:manage"), controller.resolveAlert);

  // ---- Transfer / stock count ----
  router.post(
    "/transfer",
    requirePermission("inventory:manage"),
    validateBody(transferSchema),
    controller.transfer,
  );
  router.post(
    "/count",
    requirePermission("inventory:manage"),
    validateBody(stockCountSchema),
    controller.stockCount,
  );

  // ---- Items ----
  router.get("/items", requirePermission("inventory:view"), controller.list);
  router.post(
    "/items",
    requirePermission("inventory:create"),
    validateBody(createItemSchema),
    controller.create,
  );
  router.get("/items/:id", requirePermission("inventory:view"), controller.getById);
  router.patch(
    "/items/:id",
    requirePermission("inventory:update"),
    validateBody(updateItemSchema),
    controller.update,
  );
  router.delete("/items/:id", requirePermission("inventory:delete"), controller.remove);
  router.patch("/items/:id/restore", requirePermission("inventory:update"), controller.restore);

  // ---- Item movements ----
  router.post(
    "/items/:id/movement",
    requirePermission("inventory:update"),
    validateBody(createMovementSchema),
    controller.movement,
  );
  router.post(
    "/items/:id/adjust",
    requirePermission("inventory:manage"),
    validateBody(adjustSchema),
    controller.adjust,
  );

  return router;
}
