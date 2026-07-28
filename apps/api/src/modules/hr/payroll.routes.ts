import { Router } from "express";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { PayrollController } from "./payroll.controller.js";
import { generatePayrollSchema, upsertSalaryComponentSchema } from "./payroll.validator.js";

/** مسارات الرواتب - /api/v1/hr/payroll */
export function createPayrollRouter(controller: PayrollController): Router {
  const router = Router();

  // Salary components (قبل /:id حتى لا تلتقطها)
  router.get("/components/:id", requirePermission("payroll:view"), controller.components);
  router.post("/components", requirePermission("payroll:manage"), validateBody(upsertSalaryComponentSchema), controller.createComponent);
  router.patch("/components/:id", requirePermission("payroll:manage"), validateBody(upsertSalaryComponentSchema), controller.updateComponent);
  router.delete("/components/:id", requirePermission("payroll:manage"), controller.deleteComponent);

  // Runs
  router.get("/", requirePermission("payroll:view"), controller.list);
  router.post("/generate", requirePermission("payroll:manage"), validateBody(generatePayrollSchema), controller.generate);
  router.post("/:id/approve", requirePermission("payroll:approve"), controller.approve);
  router.get("/:id", requirePermission("payroll:view"), controller.getRun);

  return router;
}
