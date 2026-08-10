import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { LeavesService } from "./leaves.service.js";
import {
  createLeaveSchema,
  leaveIdParamSchema,
  listLeavesQuerySchema,
  reviewLeaveSchema,
  upsertLeaveBalanceSchema,
} from "./leaves.validator.js";

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "يلزم تسجيل الدخول للمتابعة.");
  return req.user;
}

export class LeavesController {
  constructor(private readonly service: LeavesService) {}

  list: RequestHandler = asyncHandler(async (req, res) => {
    const query = listLeavesQuerySchema.parse(req.query);
    const { leaves, meta } = await this.service.list(query);
    sendPaginated(res, { leaves }, meta);
  });

  create: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const dto = createLeaveSchema.parse(req.body);
    sendCreated(res, { leave: await this.service.create(user, getRequestContext(req), dto) }, "تم تقديم الطلب");
  });

  review: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { id } = leaveIdParamSchema.parse(req.params);
    const dto = reviewLeaveSchema.parse(req.body);
    sendSuccess(res, { leave: await this.service.review(user, getRequestContext(req), id, dto) }, "تمت المراجعة");
  });

  cancel: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { id } = leaveIdParamSchema.parse(req.params);
    sendSuccess(res, { leave: await this.service.cancel(user, getRequestContext(req), id) }, "تم الإلغاء");
  });

  balances: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = leaveIdParamSchema.parse(req.params);
    sendSuccess(res, { balances: await this.service.balances(id) });
  });

  setBalance: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const dto = upsertLeaveBalanceSchema.parse(req.body);
    sendSuccess(res, { balance: await this.service.setBalance(user, getRequestContext(req), dto) }, "تم حفظ الرصيد");
  });
}
