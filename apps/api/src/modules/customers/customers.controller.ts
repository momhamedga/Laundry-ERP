import type { Request, RequestHandler } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from "../../utils/response.js";
import type {
  CreateCustomerDto,
  UpdateCustomerDto,
  UpdateNotesDto,
} from "./customers.dto.js";
import type { CustomersService } from "./customers.service.js";
import {
  customerIdParamSchema,
  customerPhoneParamSchema,
  listCustomersQuerySchema,
} from "./customers.validator.js";

/** التحقق من :id في المسار (cuid) */
function parseCustomerId(req: Request): string {
  return customerIdParamSchema.parse(req.params).id;
}

export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  /** GET /customers - قائمة مع ترقيم/بحث/فلاتر/ترتيب */
  list: RequestHandler = asyncHandler(async (req, res) => {
    // query تُتحقق هنا (Express 5 يمنع إعادة تعيين req.query في middleware)
    const query = listCustomersQuerySchema.parse(req.query);
    const result = await this.service.list(query);
    sendPaginated(res, { customers: result.customers }, result.meta);
  });

  /** POST /customers */
  create: RequestHandler = asyncHandler(async (req, res) => {
    const customer = await this.service.create(req.body as CreateCustomerDto);
    sendCreated(res, { customer }, "Customer created successfully");
  });

  /** GET /customers/phone/:phone - بحث مفهرس سريع */
  getByPhone: RequestHandler = asyncHandler(async (req, res) => {
    const { phone } = customerPhoneParamSchema.parse(req.params);
    const customer = await this.service.getByPhone(phone);
    sendSuccess(res, { customer });
  });

  /** POST /customers/merge - Structure فقط */
  merge: RequestHandler = asyncHandler(async (_req, _res) => {
    this.service.merge();
  });

  /** GET /customers/:id */
  getById: RequestHandler = asyncHandler(async (req, res) => {
    const customer = await this.service.getById(parseCustomerId(req));
    sendSuccess(res, { customer });
  });

  /** PATCH /customers/:id */
  update: RequestHandler = asyncHandler(async (req, res) => {
    const customer = await this.service.update(
      parseCustomerId(req),
      req.body as UpdateCustomerDto,
    );
    sendSuccess(res, { customer }, "Customer updated successfully");
  });

  /** PATCH /customers/:id/notes */
  updateNotes: RequestHandler = asyncHandler(async (req, res) => {
    const customer = await this.service.updateNotes(
      parseCustomerId(req),
      req.body as UpdateNotesDto,
    );
    sendSuccess(res, { customer }, "Notes updated successfully");
  });

  /** DELETE /customers/:id - Soft Delete */
  remove: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.softDelete(parseCustomerId(req));
    sendNoContent(res);
  });

  /** PATCH /customers/:id/restore */
  restore: RequestHandler = asyncHandler(async (req, res) => {
    const customer = await this.service.restore(parseCustomerId(req));
    sendSuccess(res, { customer }, "Customer restored successfully");
  });

  /** GET /customers/:id/stats - محسوبة من القاعدة مباشرة */
  getStats: RequestHandler = asyncHandler(async (req, res) => {
    const stats = await this.service.getStats(parseCustomerId(req));
    sendSuccess(res, { stats });
  });

  /** GET /customers/:id/profile - البيانات + آخر 10 طلبات + الإحصائيات */
  getProfile: RequestHandler = asyncHandler(async (req, res) => {
    const profile = await this.service.getProfile(parseCustomerId(req));
    sendSuccess(res, profile);
  });
}
