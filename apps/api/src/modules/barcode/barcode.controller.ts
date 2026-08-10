import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type {
  BulkGenerateDto,
  CreateTemplateDto,
  GenerateDto,
  PrintDto,
  ScanDto,
  UpdateBarcodeDto,
  UpdateTemplateDto,
} from "./barcode.dto.js";
import type { BarcodeService } from "./barcode.service.js";
import {
  bulkGenerateSchema,
  createTemplateSchema,
  generateSchema,
  itemIdParamSchema,
  listTemplatesQuerySchema,
  lookupQuerySchema,
  printHistoryQuerySchema,
  printSchema,
  scanHistoryQuerySchema,
  scanSchema,
  templateIdParamSchema,
  updateBarcodeSchema,
  updateTemplateSchema,
} from "./barcode.validator.js";

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "يلزم تسجيل الدخول للمتابعة.");
  return req.user;
}

function parseItemId(req: Request): string {
  return itemIdParamSchema.parse(req.params).id;
}

function parseTemplateId(req: Request): string {
  return templateIdParamSchema.parse(req.params).id;
}

export class BarcodeController {
  constructor(private readonly service: BarcodeService) {}

  // ---- Generate ----
  generate: RequestHandler = asyncHandler(async (req, res) => {
    const dto = generateSchema.parse(req.body);
    const item = await this.service.generate(parseItemId(req), dto, requireUser(req), getRequestContext(req));
    sendSuccess(res, { item }, "Barcode generated");
  });

  regenerate: RequestHandler = asyncHandler(async (req, res) => {
    const dto = generateSchema.parse(req.body);
    const item = await this.service.regenerate(parseItemId(req), dto.type, requireUser(req), getRequestContext(req));
    sendSuccess(res, { item }, "Barcode regenerated");
  });

  bulkGenerate: RequestHandler = asyncHandler(async (req, res) => {
    const result = await this.service.bulkGenerate(
      req.body as BulkGenerateDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, result, `Generated ${result.generated}, skipped ${result.skipped}`);
  });

  update: RequestHandler = asyncHandler(async (req, res) => {
    const item = await this.service.updateBarcode(
      parseItemId(req),
      req.body as UpdateBarcodeDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { item }, "Barcode updated");
  });

  remove: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.deleteBarcode(parseItemId(req), requireUser(req), getRequestContext(req));
    sendNoContent(res);
  });

  randomSku: RequestHandler = asyncHandler(async (_req, res) => {
    sendSuccess(res, this.service.randomSku());
  });

  stats: RequestHandler = asyncHandler(async (_req, res) => {
    const stats = await this.service.getStats();
    sendSuccess(res, { stats });
  });

  // ---- Print ----
  print: RequestHandler = asyncHandler(async (req, res) => {
    const result = await this.service.print(req.body as PrintDto, requireUser(req), getRequestContext(req));
    sendSuccess(res, result, `Printed ${result.labels} label(s)`);
  });

  printHistory: RequestHandler = asyncHandler(async (req, res) => {
    const query = printHistoryQuerySchema.parse(req.query);
    const { logs, meta } = await this.service.listPrintHistory(query);
    sendPaginated(res, { logs }, meta);
  });

  // ---- Scan ----
  scan: RequestHandler = asyncHandler(async (req, res) => {
    const result = await this.service.scan(req.body as ScanDto, requireUser(req), getRequestContext(req));
    sendSuccess(res, { result });
  });

  lookup: RequestHandler = asyncHandler(async (req, res) => {
    const { code } = lookupQuerySchema.parse(req.query);
    const result = await this.service.lookup(code);
    sendSuccess(res, { result });
  });

  scanHistory: RequestHandler = asyncHandler(async (req, res) => {
    const query = scanHistoryQuerySchema.parse(req.query);
    const { scans, meta } = await this.service.listScanHistory(query);
    sendPaginated(res, { scans }, meta);
  });

  // ---- Templates ----
  createTemplate: RequestHandler = asyncHandler(async (req, res) => {
    const tpl = await this.service.createTemplate(
      req.body as CreateTemplateDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendCreated(res, { template: tpl }, "Template created");
  });

  listTemplates: RequestHandler = asyncHandler(async (req, res) => {
    const query = listTemplatesQuerySchema.parse(req.query);
    const { templates, meta } = await this.service.listTemplates(query);
    sendPaginated(res, { templates }, meta);
  });

  getTemplate: RequestHandler = asyncHandler(async (req, res) => {
    const template = await this.service.getTemplate(parseTemplateId(req));
    sendSuccess(res, { template });
  });

  updateTemplate: RequestHandler = asyncHandler(async (req, res) => {
    const template = await this.service.updateTemplate(
      parseTemplateId(req),
      req.body as UpdateTemplateDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { template }, "Template updated");
  });

  deleteTemplate: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.deleteTemplate(parseTemplateId(req), requireUser(req), getRequestContext(req));
    sendNoContent(res);
  });
}
