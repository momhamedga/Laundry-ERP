import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { CreateInvoiceDto, EmailInvoiceDto, UpdateInvoiceDto } from "./invoice.dto.js";
import type { InvoicesService } from "./invoice.service.js";
import {
  createInvoicePaymentSchema,
  invoiceIdParamSchema,
  listInvoicePaymentsQuerySchema,
  listInvoicesQuerySchema,
} from "./invoice.validator.js";

/** يضمن وجود req.user - تُستدعى فقط بعد authenticate */
function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "Authentication required");
  return req.user;
}

/** التحقق من :id في المسار (cuid) */
function parseInvoiceId(req: Request): string {
  return invoiceIdParamSchema.parse(req.params).id;
}

export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  /** GET /invoices - قائمة مع ترقيم/بحث/فلاتر/ترتيب */
  list: RequestHandler = asyncHandler(async (req, res) => {
    // query تُتحقق هنا (Express 5 يمنع إعادة تعيين req.query في middleware)
    const query = listInvoicesQuerySchema.parse(req.query);
    const result = await this.service.list(query);
    sendPaginated(res, { invoices: result.invoices }, result.meta);
  });

  /** GET /invoices/:id */
  getById: RequestHandler = asyncHandler(async (req, res) => {
    const invoice = await this.service.getById(parseInvoiceId(req));
    sendSuccess(res, { invoice });
  });

  /** POST /invoices - ينسخ subtotal/discount/items من الطلب بالخادم */
  create: RequestHandler = asyncHandler(async (req, res) => {
    const invoice = await this.service.create(req.body as CreateInvoiceDto, requireUser(req));
    sendSuccess(res, { invoice }, `Invoice ${invoice.invoiceNumber} created successfully`, 201);
  });

  /** PUT /invoices/:id */
  update: RequestHandler = asyncHandler(async (req, res) => {
    const invoice = await this.service.update(
      parseInvoiceId(req),
      req.body as UpdateInvoiceDto,
      requireUser(req),
    );
    sendSuccess(res, { invoice }, "Invoice updated successfully");
  });

  /** DELETE /invoices/:id */
  delete: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.delete(parseInvoiceId(req), requireUser(req));
    res.status(204).send();
  });

  /** GET /invoices/:id/print - HTML خام قابل للطباعة، وليس PDF */
  print: RequestHandler = asyncHandler(async (req, res) => {
    const html = await this.service.getPrintHtml(
      parseInvoiceId(req),
      requireUser(req),
      getRequestContext(req),
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });

  /** GET /invoices/:id/pdf - application/pdf، عرض مباشر (inline) */
  pdf: RequestHandler = asyncHandler(async (req, res) => {
    const { buffer, invoiceNumber } = await this.service.getPdfBuffer(
      parseInvoiceId(req),
      requireUser(req),
      getRequestContext(req),
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${invoiceNumber}.pdf"`);
    res.status(200).send(buffer);
  });

  /** GET /invoices/:id/download - نفس ملف PDF، لكن تنزيل إجباري (attachment) */
  download: RequestHandler = asyncHandler(async (req, res) => {
    const { buffer, invoiceNumber } = await this.service.getPdfBuffer(
      parseInvoiceId(req),
      requireUser(req),
      getRequestContext(req),
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoiceNumber}.pdf"`);
    res.status(200).send(buffer);
  });

  /** POST /invoices/:id/email */
  email: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.emailInvoice(
      parseInvoiceId(req),
      req.body as EmailInvoiceDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, null, "Invoice emailed successfully");
  });

  /** GET /invoices/:id/payments - مدفوعات طلب الفاتورة مع ترقيم */
  listPayments: RequestHandler = asyncHandler(async (req, res) => {
    const query = listInvoicePaymentsQuerySchema.parse(req.query);
    const result = await this.service.listInvoicePayments(parseInvoiceId(req), query);
    sendPaginated(res, { payments: result.payments }, result.meta);
  });

  /** POST /invoices/:id/payments - إنشاء دفعة على طلب الفاتورة (ذري) */
  createPayment: RequestHandler = asyncHandler(async (req, res) => {
    const dto = createInvoicePaymentSchema.parse(req.body);
    const payment = await this.service.createInvoicePayment(
      parseInvoiceId(req),
      dto,
      requireUser(req),
      getRequestContext(req),
    );
    sendCreated(res, { payment }, "Payment recorded successfully");
  });
}
