import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendPaginated, sendSuccess } from "../../utils/response.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type {
  CancelOrderDto,
  ChangeStatusDto,
  CreateOrderDto,
  UpdateOrderDto,
} from "./orders.dto.js";
import type { OrdersService } from "./orders.service.js";
import {
  listOrdersQuerySchema,
  orderIdParamSchema,
  orderNumberParamSchema,
} from "./orders.validator.js";

/** يضمن وجود req.user - تُستدعى فقط بعد authenticate */
function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "Authentication required");
  return req.user;
}

/** التحقق من :id في المسار (cuid) */
function parseOrderId(req: Request): string {
  return orderIdParamSchema.parse(req.params).id;
}

export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  /** POST /orders */
  create: RequestHandler = asyncHandler(async (req, res) => {
    const order = await this.service.create(
      req.body as CreateOrderDto,
      requireUser(req),
    );
    sendCreated(res, { order }, `Order ${order.orderNumber} created successfully`);
  });

  /** GET /orders - قائمة مع ترقيم/بحث/فلاتر/ترتيب */
  list: RequestHandler = asyncHandler(async (req, res) => {
    // query تُتحقق هنا (Express 5 يمنع إعادة تعيين req.query في middleware)
    const query = listOrdersQuerySchema.parse(req.query);
    const result = await this.service.list(query);
    sendPaginated(res, { orders: result.orders }, result.meta);
  });

  /** GET /orders/number/:orderNumber */
  getByNumber: RequestHandler = asyncHandler(async (req, res) => {
    const { orderNumber } = orderNumberParamSchema.parse(req.params);
    const order = await this.service.getByNumber(orderNumber);
    sendSuccess(res, { order });
  });

  /** GET /orders/:id */
  getById: RequestHandler = asyncHandler(async (req, res) => {
    const order = await this.service.getById(parseOrderId(req));
    sendSuccess(res, { order });
  });

  /** PATCH /orders/:id - يعاد حساب الإجماليات بالخادم */
  update: RequestHandler = asyncHandler(async (req, res) => {
    const order = await this.service.update(
      parseOrderId(req),
      req.body as UpdateOrderDto,
    );
    sendSuccess(res, { order }, "Order updated successfully");
  });

  /** PATCH /orders/:id/status - انتقال للأمام فقط + سجل تاريخ */
  changeStatus: RequestHandler = asyncHandler(async (req, res) => {
    const order = await this.service.changeStatus(
      parseOrderId(req),
      req.body as ChangeStatusDto,
      requireUser(req),
    );
    sendSuccess(res, { order }, `Order status changed to ${order.status}`);
  });

  /** POST /orders/:id/cancel */
  cancel: RequestHandler = asyncHandler(async (req, res) => {
    const order = await this.service.cancel(
      parseOrderId(req),
      req.body as CancelOrderDto,
      requireUser(req),
    );
    sendSuccess(res, { order }, "Order cancelled");
  });

  /** GET /orders/:id/history - سجل تغييرات الحالة */
  getHistory: RequestHandler = asyncHandler(async (req, res) => {
    const history = await this.service.getHistory(parseOrderId(req));
    sendSuccess(res, { history });
  });
}
