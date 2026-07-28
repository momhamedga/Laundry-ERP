import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { CreatePurchaseDto, UpdatePurchaseDto } from "./purchases.dto.js";
import type { PurchasesService } from "./purchases.service.js";
import { listPurchasesQuerySchema, purchaseIdParamSchema } from "./purchases.validator.js";

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "Authentication required");
  return req.user;
}

function parseId(req: Request): string {
  return purchaseIdParamSchema.parse(req.params).id;
}

export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  list: RequestHandler = asyncHandler(async (req, res) => {
    const query = listPurchasesQuerySchema.parse(req.query);
    const { purchases, meta } = await this.service.list(query);
    sendPaginated(res, { purchases }, meta);
  });

  create: RequestHandler = asyncHandler(async (req, res) => {
    const purchase = await this.service.create(
      req.body as CreatePurchaseDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendCreated(res, { purchase }, `Purchase ${purchase.purchaseNumber} created`);
  });

  getById: RequestHandler = asyncHandler(async (req, res) => {
    const purchase = await this.service.getById(parseId(req));
    sendSuccess(res, { purchase });
  });

  update: RequestHandler = asyncHandler(async (req, res) => {
    const purchase = await this.service.update(
      parseId(req),
      req.body as UpdatePurchaseDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { purchase }, "Purchase updated");
  });

  remove: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.remove(parseId(req), requireUser(req), getRequestContext(req));
    sendNoContent(res);
  });

  receive: RequestHandler = asyncHandler(async (req, res) => {
    const purchase = await this.service.receive(parseId(req), requireUser(req), getRequestContext(req));
    sendSuccess(res, { purchase }, "Purchase received - stock updated");
  });

  cancel: RequestHandler = asyncHandler(async (req, res) => {
    const purchase = await this.service.cancel(parseId(req), requireUser(req), getRequestContext(req));
    sendSuccess(res, { purchase }, "Purchase cancelled");
  });
}
