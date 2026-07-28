import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { InvoicesController } from "./invoice.controller.js";
import {
  createInvoicePaymentSchema,
  createInvoiceSchema,
  emailInvoiceSchema,
  updateInvoiceSchema,
} from "./invoice.validator.js";

/**
 * مسارات الفواتير - /api/v1/invoices
 * الصلاحيات:
 * - invoices:read   → ADMIN, MANAGER, CASHIER
 * - invoices:create → ADMIN, MANAGER, CASHIER
 * - invoices:update → ADMIN, MANAGER فقط (تعديل سجل مالي)
 * - invoices:delete → ADMIN, MANAGER فقط (حذف سجل مالي)
 * - invoices:print  → ADMIN, MANAGER, CASHIER (نفس فئة القراءة - إجراء خدمة عملاء روتيني)
 * - invoices:email  → ADMIN, MANAGER, CASHIER (نفس فئة القراءة)
 * - WORKER, DELIVERY → لا وصول للفواتير
 * - PDF/Download يستخدمان invoices:read مباشرة (نفس تمثيل القراءة، بصيغة PDF فقط)
 */
export function createInvoicesRouter(controller: InvoicesController): Router {
  const router = Router();

  router.use(authenticate);

  // Collection
  router.get("/", requirePermission("invoices:read"), controller.list);
  router.post(
    "/",
    requirePermission("invoices:create"),
    validateBody(createInvoiceSchema),
    controller.create,
  );

  // Item
  router.get("/:id", requirePermission("invoices:read"), controller.getById);
  router.put(
    "/:id",
    requirePermission("invoices:update"),
    validateBody(updateInvoiceSchema),
    controller.update,
  );
  router.delete("/:id", requirePermission("invoices:delete"), controller.delete);

  // Documents
  router.get("/:id/pdf", requirePermission("invoices:read"), controller.pdf);
  router.get("/:id/download", requirePermission("invoices:read"), controller.download);
  router.get("/:id/print", requirePermission("invoices:print"), controller.print);
  router.post(
    "/:id/email",
    requirePermission("invoices:email"),
    validateBody(emailInvoiceSchema),
    controller.email,
  );

  // Payments (تكامل الفاتورة ↔ المدفوعات) - يُعيد استخدام صلاحيات payments الموجودة
  router.get("/:id/payments", requirePermission("payments:read"), controller.listPayments);
  router.post(
    "/:id/payments",
    requirePermission("payments:create"),
    validateBody(createInvoicePaymentSchema),
    controller.createPayment,
  );

  return router;
}
