import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { EmployeesController } from "./employees.controller.js";
import {
  changeEmployeeStatusSchema,
  createDocumentSchema,
  createEmployeeSchema,
  updateDocumentSchema,
  updateEmployeeSchema,
} from "./employees.validator.js";

/**
 * مسارات الموظفين - /api/v1/employees
 * employees:read قراءة | employees:manage إنشاء/تعديل/تغيير حالة
 */
export function createEmployeesRouter(controller: EmployeesController): Router {
  const router = Router();
  router.use(authenticate);

  router.get("/stats", requirePermission("employees:read"), controller.stats);
  // مستندات منتهية/قاربت (Phase 9.6b) - قبل /:id
  router.get("/documents/expiring", requirePermission("employees:read"), controller.expiringDocuments);
  router.get("/", requirePermission("employees:read"), controller.list);
  router.post(
    "/",
    requirePermission("employees:manage"),
    validateBody(createEmployeeSchema),
    controller.create,
  );

  router.get("/:id", requirePermission("employees:read"), controller.getById);
  router.patch(
    "/:id",
    requirePermission("employees:manage"),
    validateBody(updateEmployeeSchema),
    controller.update,
  );
  router.patch(
    "/:id/status",
    requirePermission("employees:manage"),
    validateBody(changeEmployeeStatusSchema),
    controller.changeStatus,
  );

  // Documents (Phase 9.6b) - متداخلة تحت الموظف
  router.get("/:id/documents", requirePermission("employees:read"), controller.listDocuments);
  router.post("/:id/documents", requirePermission("employees:manage"), validateBody(createDocumentSchema), controller.createDocument);
  router.patch("/documents/:id", requirePermission("employees:manage"), validateBody(updateDocumentSchema), controller.updateDocument);
  router.delete("/documents/:id", requirePermission("employees:manage"), controller.deleteDocument);

  return router;
}
