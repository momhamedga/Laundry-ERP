import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { DayClosingService } from "./day-closing.service.js";
import {
  cashMovementSchema,
  closeDaySchema,
  dayIdParamSchema,
  listDayClosingsQuerySchema,
  openDaySchema,
  reopenDaySchema,
} from "./day-closing.validator.js";

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "Authentication required");
  return req.user;
}

export class DayClosingController {
  constructor(private readonly service: DayClosingService) {}

  // Read
  current: RequestHandler = asyncHandler(async (_req, res) => {
    sendSuccess(res, { current: await this.service.getCurrent() });
  });

  dashboard: RequestHandler = asyncHandler(async (_req, res) => {
    sendSuccess(res, { dashboard: await this.service.getDashboard() });
  });

  preCloseCheck: RequestHandler = asyncHandler(async (_req, res) => {
    sendSuccess(res, { check: await this.service.preCloseCheck() });
  });

  list: RequestHandler = asyncHandler(async (req, res) => {
    const query = listDayClosingsQuerySchema.parse(req.query);
    const { closings, meta } = await this.service.list(query);
    sendPaginated(res, { closings }, meta);
  });

  getById: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = dayIdParamSchema.parse(req.params);
    sendSuccess(res, { closing: await this.service.getById(id) });
  });

  // Workflow
  open: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const dto = openDaySchema.parse(req.body);
    const closing = await this.service.openDay(user, getRequestContext(req), dto);
    sendCreated(res, { closing }, "تم فتح يوم العمل");
  });

  close: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const dto = closeDaySchema.parse(req.body);
    const closing = await this.service.closeDay(user, getRequestContext(req), dto);
    sendSuccess(res, { closing }, "تم إغلاق يوم العمل");
  });

  reopen: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { id } = dayIdParamSchema.parse(req.params);
    const dto = reopenDaySchema.parse(req.body);
    const closing = await this.service.reopenDay(user, getRequestContext(req), id, dto);
    sendSuccess(res, { closing }, "تمت إعادة فتح اليوم");
  });

  approve: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { id } = dayIdParamSchema.parse(req.params);
    const closing = await this.service.approveDay(user, getRequestContext(req), id);
    sendSuccess(res, { closing }, "تم اعتماد اليوم");
  });

  cashMovement: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const dto = cashMovementSchema.parse(req.body);
    const closing = await this.service.recordCashMovement(user, getRequestContext(req), dto);
    sendSuccess(res, { closing }, "تم تسجيل الحركة النقدية");
  });
}
