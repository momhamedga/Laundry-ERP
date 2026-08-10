import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { CreateSupplierDto, UpdateSupplierDto } from "./suppliers.dto.js";
import type { SuppliersService } from "./suppliers.service.js";
import {
  listSuppliersQuerySchema,
  supplierIdParamSchema,
} from "./suppliers.validator.js";

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "يلزم تسجيل الدخول للمتابعة.");
  return req.user;
}

function parseId(req: Request): string {
  return supplierIdParamSchema.parse(req.params).id;
}

export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  list: RequestHandler = asyncHandler(async (req, res) => {
    const query = listSuppliersQuerySchema.parse(req.query);
    const result = await this.service.list(query);
    sendPaginated(res, { suppliers: result.suppliers }, result.meta);
  });

  create: RequestHandler = asyncHandler(async (req, res) => {
    const supplier = await this.service.create(
      req.body as CreateSupplierDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendCreated(res, { supplier }, "Supplier created successfully");
  });

  getById: RequestHandler = asyncHandler(async (req, res) => {
    const supplier = await this.service.getById(parseId(req));
    sendSuccess(res, { supplier });
  });

  getStats: RequestHandler = asyncHandler(async (req, res) => {
    const stats = await this.service.getStats(parseId(req));
    sendSuccess(res, { stats });
  });

  update: RequestHandler = asyncHandler(async (req, res) => {
    const supplier = await this.service.update(
      parseId(req),
      req.body as UpdateSupplierDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { supplier }, "Supplier updated successfully");
  });

  remove: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.disable(parseId(req), requireUser(req), getRequestContext(req));
    sendNoContent(res);
  });

  restore: RequestHandler = asyncHandler(async (req, res) => {
    const supplier = await this.service.restore(parseId(req), requireUser(req), getRequestContext(req));
    sendSuccess(res, { supplier }, "Supplier restored successfully");
  });
}
