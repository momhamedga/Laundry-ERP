import { Router } from "express";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { validateBody } from "../auth/auth.validator.js";
import type { AttendanceController } from "./attendance.controller.js";
import {
  attendanceCorrectionSchema,
  clockActionSchema,
  employeeRefSchema,
} from "./attendance.validator.js";

/** مسارات الحضور - /api/v1/hr/attendance (authenticate مطبّق بالراوتر الأب) */
export function createAttendanceRouter(controller: AttendanceController): Router {
  const router = Router();

  router.get("/", requirePermission("attendance:view"), controller.list);
  router.post("/clock-in", requirePermission("attendance:manage"), validateBody(clockActionSchema), controller.clockIn);
  router.post("/clock-out", requirePermission("attendance:manage"), validateBody(employeeRefSchema), controller.clockOut);
  router.post("/break/start", requirePermission("attendance:manage"), validateBody(employeeRefSchema), controller.startBreak);
  router.post("/break/resume", requirePermission("attendance:manage"), validateBody(employeeRefSchema), controller.resumeBreak);
  router.post("/correction", requirePermission("attendance:manage"), validateBody(attendanceCorrectionSchema), controller.correct);
  router.post("/:id/approve", requirePermission("attendance:manage"), controller.approve);

  return router;
}
