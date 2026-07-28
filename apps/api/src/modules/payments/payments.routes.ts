import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { PaymentsController } from "./payments.controller.js";
import {
  cancelPaymentSchema,
  createPaymentSchema,
  refundPaymentSchema,
  updatePaymentSchema,
} from "./payments.validator.js";

/**
 * مسارات المدفوعات - /api/v1/payments
 * الصلاحيات:
 * - payments:read   → ADMIN, MANAGER, CASHIER
 * - payments:create → ADMIN, MANAGER, CASHIER (إنشاء وتعديل المعلق)
 * - refund / cancel → ADMIN, MANAGER فقط (عمليات مالية حساسة)
 * - WORKER, DELIVERY → لا وصول للمدفوعات
 */
export function createPaymentsRouter(controller: PaymentsController): Router {
  const router = Router();

  router.use(authenticate);

  // Collection
  router.get("/", requirePermission("payments:read"), controller.list);
  router.post(
    "/",
    requirePermission("payments:create"),
    validateBody(createPaymentSchema),
    controller.create,
  );

  // Item
  router.get("/:id", requirePermission("payments:read"), controller.getById);

  // Receipt (طباعة إيصال الدفع) - يُعيد استخدام payments:read، بلا صلاحية جديدة
  router.get("/:id/receipt", requirePermission("payments:read"), controller.receipt);
  router.get("/:id/receipt/pdf", requirePermission("payments:read"), controller.receiptPdf);
  router.patch(
    "/:id",
    requirePermission("payments:create"),
    validateBody(updatePaymentSchema),
    controller.update,
  );
  router.post(
    "/:id/refund",
    requireRole("ADMIN", "MANAGER"),
    validateBody(refundPaymentSchema),
    controller.refund,
  );
  router.post(
    "/:id/cancel",
    requireRole("ADMIN", "MANAGER"),
    validateBody(cancelPaymentSchema),
    controller.cancel,
  );

  return router;
}
