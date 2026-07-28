import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { OrdersController } from "./orders.controller.js";
import {
  cancelOrderSchema,
  changeStatusSchema,
  createOrderSchema,
  updateOrderSchema,
} from "./orders.validator.js";

/**
 * مسارات الطلبات - /api/v1/orders
 * الصلاحيات:
 * - orders:read          → كل الأدوار (ADMIN, MANAGER, CASHIER, WORKER, DELIVERY)
 * - orders:create        → ADMIN, MANAGER, CASHIER (الإنشاء والتعديل)
 * - orders:update-status → الكل + WORKER وDELIVERY (تقدم خط الإنتاج)
 * - orders:cancel        → ADMIN, MANAGER فقط
 */
export function createOrdersRouter(controller: OrdersController): Router {
  const router = Router();

  router.use(authenticate);

  // Static routes قبل /:id
  router.get("/number/:orderNumber", requirePermission("orders:read"), controller.getByNumber);

  // Collection
  router.get("/", requirePermission("orders:read"), controller.list);
  router.post(
    "/",
    requirePermission("orders:create"),
    validateBody(createOrderSchema),
    controller.create,
  );

  // Item
  router.get("/:id", requirePermission("orders:read"), controller.getById);
  router.patch(
    "/:id",
    requirePermission("orders:create"),
    validateBody(updateOrderSchema),
    controller.update,
  );
  router.patch(
    "/:id/status",
    requirePermission("orders:update-status"),
    validateBody(changeStatusSchema),
    controller.changeStatus,
  );
  router.post(
    "/:id/cancel",
    requirePermission("orders:cancel"),
    validateBody(cancelOrderSchema),
    controller.cancel,
  );
  router.get("/:id/history", requirePermission("orders:read"), controller.getHistory);

  return router;
}
