import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { ExpensesService } from "./expenses.service.js";
import {
  cancelExpenseSchema,
  expenseIdParamSchema,
  listExpensesQuerySchema,
  operatingSummaryQuerySchema,
} from "./expenses.validator.js";

/** يضمن وجود req.user - تُستدعى فقط بعد authenticate */
function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "يلزم تسجيل الدخول للمتابعة.");
  return req.user;
}

export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  /** GET /expenses */
  list: RequestHandler = asyncHandler(async (req, res) => {
    const query = listExpensesQuerySchema.parse(req.query);
    const { expenses, meta, totalAmount } = await this.service.list(query);
    // الإجمالي في data لا في meta: meta للترقيم، والإجمالي بيانات مالية
    sendSuccess(res, { expenses, totalAmount }, undefined, 200, meta);
  });

  /** GET /expenses/summary - إيراد ومصروف وناتج تشغيلي لفترة */
  summary: RequestHandler = asyncHandler(async (req, res) => {
    const query = operatingSummaryQuerySchema.parse(req.query);
    const summary = await this.service.operatingSummary(query);
    sendSuccess(res, { summary });
  });

  /** GET /expenses/:id */
  getById: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = expenseIdParamSchema.parse(req.params);
    const expense = await this.service.getById(id);
    sendSuccess(res, { expense });
  });

  /** POST /expenses */
  create: RequestHandler = asyncHandler(async (req, res) => {
    // الجسم مُتحقَّق منه في المسار عبر validateBody - req.body آمن هنا
    const expense = await this.service.create(
      req.body as never,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { expense }, "تم تسجيل المصروف", 201);
  });

  /** PATCH /expenses/:id */
  update: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = expenseIdParamSchema.parse(req.params);
    const expense = await this.service.update(
      id,
      req.body as never,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { expense }, "تم تحديث المصروف");
  });

  /** POST /expenses/:id/cancel - إلغاء لا حذف (السجلّ المالي يبقى) */
  cancel: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = expenseIdParamSchema.parse(req.params);
    const dto = cancelExpenseSchema.parse(req.body ?? {});
    const expense = await this.service.cancel(
      id,
      dto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { expense }, "تم إلغاء المصروف");
  });
}
