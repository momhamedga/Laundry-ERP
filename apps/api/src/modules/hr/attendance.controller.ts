import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { AttendanceService } from "./attendance.service.js";
import {
  attendanceCorrectionSchema,
  attendanceIdParamSchema,
  clockActionSchema,
  employeeRefSchema,
  listAttendanceQuerySchema,
} from "./attendance.validator.js";

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "يلزم تسجيل الدخول للمتابعة.");
  return req.user;
}

export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  list: RequestHandler = asyncHandler(async (req, res) => {
    const query = listAttendanceQuerySchema.parse(req.query);
    const { records, meta } = await this.service.list(query);
    sendPaginated(res, { records }, meta);
  });

  clockIn: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const dto = clockActionSchema.parse(req.body);
    sendSuccess(res, { record: await this.service.clockIn(user, getRequestContext(req), dto) }, "تم تسجيل الحضور");
  });

  clockOut: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const dto = employeeRefSchema.parse(req.body);
    sendSuccess(res, { record: await this.service.clockOut(user, getRequestContext(req), dto) }, "تم تسجيل الانصراف");
  });

  startBreak: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const dto = employeeRefSchema.parse(req.body);
    sendSuccess(res, { record: await this.service.startBreak(user, getRequestContext(req), dto) });
  });

  resumeBreak: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const dto = employeeRefSchema.parse(req.body);
    sendSuccess(res, { record: await this.service.resumeBreak(user, getRequestContext(req), dto) });
  });

  correct: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const dto = attendanceCorrectionSchema.parse(req.body);
    sendSuccess(res, { record: await this.service.correct(user, getRequestContext(req), dto) }, "تم حفظ التصحيح");
  });

  approve: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { id } = attendanceIdParamSchema.parse(req.params);
    sendSuccess(res, { record: await this.service.approve(user, getRequestContext(req), id) }, "تم الاعتماد");
  });
}
