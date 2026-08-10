import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type {
  CancelPaymentDto,
  CreatePaymentDto,
  RefundPaymentDto,
  UpdatePaymentDto,
} from "./payments.dto.js";
import type { PaymentsService } from "./payments.service.js";
import {
  listPaymentsQuerySchema,
  paymentIdParamSchema,
} from "./payments.validator.js";

/** يضمن وجود req.user - تُستدعى فقط بعد authenticate */
function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "يلزم تسجيل الدخول للمتابعة.");
  return req.user;
}

/** التحقق من :id في المسار (cuid) */
function parsePaymentId(req: Request): string {
  return paymentIdParamSchema.parse(req.params).id;
}

export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  /** POST /payments */
  create: RequestHandler = asyncHandler(async (req, res) => {
    const payment = await this.service.create(
      req.body as CreatePaymentDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendCreated(res, { payment }, "Payment recorded successfully");
  });

  /** GET /payments - قائمة مع ترقيم/بحث/فلاتر/ترتيب */
  list: RequestHandler = asyncHandler(async (req, res) => {
    // query تُتحقق هنا (Express 5 يمنع إعادة تعيين req.query في middleware)
    const query = listPaymentsQuerySchema.parse(req.query);
    const result = await this.service.list(query);
    sendPaginated(res, { payments: result.payments }, result.meta);
  });

  /** GET /payments/:id */
  getById: RequestHandler = asyncHandler(async (req, res) => {
    const payment = await this.service.getById(parsePaymentId(req));
    sendSuccess(res, { payment });
  });

  /** PATCH /payments/:id - للدفعات المعلقة فقط */
  update: RequestHandler = asyncHandler(async (req, res) => {
    const payment = await this.service.update(
      parsePaymentId(req),
      req.body as UpdatePaymentDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { payment }, "Payment updated successfully");
  });

  /** POST /payments/:id/refund - داخل Transaction */
  refund: RequestHandler = asyncHandler(async (req, res) => {
    const payment = await this.service.refund(
      parsePaymentId(req),
      req.body as RefundPaymentDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { payment }, "Payment refunded");
  });

  /** POST /payments/:id/cancel - للدفعات المعلقة فقط */
  cancel: RequestHandler = asyncHandler(async (req, res) => {
    const payment = await this.service.cancel(
      parsePaymentId(req),
      req.body as CancelPaymentDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { payment }, "Payment cancelled");
  });

  /** GET /payments/:id/receipt - إيصال HTML خام قابل للطباعة، وليس PDF */
  receipt: RequestHandler = asyncHandler(async (req, res) => {
    const html = await this.service.getReceiptHtml(parsePaymentId(req));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });

  /** GET /payments/:id/receipt/pdf - إيصال PDF، عرض مباشر (inline) */
  receiptPdf: RequestHandler = asyncHandler(async (req, res) => {
    const { buffer, reference } = await this.service.getReceiptPdf(parsePaymentId(req));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="receipt-${reference}.pdf"`);
    res.status(200).send(buffer);
  });
}
