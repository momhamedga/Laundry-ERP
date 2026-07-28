import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { AttendanceController } from "./attendance.controller.js";
import { AttendanceRepository } from "./attendance.repository.js";
import { createAttendanceRouter } from "./attendance.routes.js";
import { AttendanceService } from "./attendance.service.js";
import { LeavesController } from "./leaves.controller.js";
import { LeavesRepository } from "./leaves.repository.js";
import { createLeavesRouter } from "./leaves.routes.js";
import { LeavesService } from "./leaves.service.js";
import { PayrollController } from "./payroll.controller.js";
import { PayrollRepository } from "./payroll.repository.js";
import { createPayrollRouter } from "./payroll.routes.js";
import { PayrollService } from "./payroll.service.js";

/**
 * Composition Root لوحدة الموارد البشرية - /api/v1/hr
 * ثلاثة راوترات فرعية (attendance/leaves/payroll) خلف authenticate واحد،
 * كلٌّ بطبقاته Repository/Service/Controller/Router الخاصة (نفس نمط المشروع).
 */
export function buildHrModule(): Router {
  const router = Router();
  router.use(authenticate);

  const attendance = new AttendanceController(new AttendanceService(new AttendanceRepository(prisma)));
  const leaves = new LeavesController(new LeavesService(new LeavesRepository(prisma)));
  const payroll = new PayrollController(new PayrollService(new PayrollRepository(prisma)));

  router.use("/attendance", createAttendanceRouter(attendance));
  router.use("/leaves", createLeavesRouter(leaves));
  router.use("/payroll", createPayrollRouter(payroll));

  return router;
}
