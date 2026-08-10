import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type {
  AdjustDto,
  CreateItemDto,
  CreateMovementDto,
  StockCountDto,
  TransferDto,
  UpdateItemDto,
} from "./inventory.dto.js";
import type { InventoryService } from "./inventory.service.js";
import {
  alertIdParamSchema,
  itemIdParamSchema,
  listAlertsQuerySchema,
  listItemsQuerySchema,
  listMovementsQuerySchema,
} from "./inventory.validator.js";

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "يلزم تسجيل الدخول للمتابعة.");
  return req.user;
}

function parseItemId(req: Request): string {
  return itemIdParamSchema.parse(req.params).id;
}

export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  // ---- Items ----
  list: RequestHandler = asyncHandler(async (req, res) => {
    const query = listItemsQuerySchema.parse(req.query);
    const result = await this.service.list(query);
    sendPaginated(res, { items: result.items }, result.meta);
  });

  stats: RequestHandler = asyncHandler(async (_req, res) => {
    const stats = await this.service.getStats();
    sendSuccess(res, { stats });
  });

  create: RequestHandler = asyncHandler(async (req, res) => {
    const item = await this.service.create(
      req.body as CreateItemDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendCreated(res, { item }, "Inventory item created");
  });

  getById: RequestHandler = asyncHandler(async (req, res) => {
    const item = await this.service.getById(parseItemId(req));
    sendSuccess(res, { item });
  });

  update: RequestHandler = asyncHandler(async (req, res) => {
    const item = await this.service.update(
      parseItemId(req),
      req.body as UpdateItemDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { item }, "Inventory item updated");
  });

  remove: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.softDelete(parseItemId(req), requireUser(req), getRequestContext(req));
    sendNoContent(res);
  });

  restore: RequestHandler = asyncHandler(async (req, res) => {
    const item = await this.service.restore(parseItemId(req), requireUser(req), getRequestContext(req));
    sendSuccess(res, { item }, "Inventory item restored");
  });

  // ---- Movements ----
  movement: RequestHandler = asyncHandler(async (req, res) => {
    const item = await this.service.createMovement(
      parseItemId(req),
      req.body as CreateMovementDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { item }, "Movement recorded");
  });

  adjust: RequestHandler = asyncHandler(async (req, res) => {
    const item = await this.service.adjust(
      parseItemId(req),
      req.body as AdjustDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { item }, "Stock adjusted");
  });

  transfer: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.transfer(req.body as TransferDto, requireUser(req), getRequestContext(req));
    sendSuccess(res, { ok: true }, "Stock transferred");
  });

  stockCount: RequestHandler = asyncHandler(async (req, res) => {
    const results = await this.service.stockCount(
      req.body as StockCountDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { results }, "Stock count applied");
  });

  listMovements: RequestHandler = asyncHandler(async (req, res) => {
    const query = listMovementsQuerySchema.parse(req.query);
    const { movements, meta } = await this.service.listMovements(query);
    sendPaginated(res, { movements }, meta);
  });

  // ---- Alerts ----
  listAlerts: RequestHandler = asyncHandler(async (req, res) => {
    const query = listAlertsQuerySchema.parse(req.query);
    const { alerts, meta } = await this.service.listAlerts(query);
    sendPaginated(res, { alerts }, meta);
  });

  resolveAlert: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = alertIdParamSchema.parse(req.params);
    await this.service.resolveAlert(id);
    sendSuccess(res, { id }, "Alert resolved");
  });
}
