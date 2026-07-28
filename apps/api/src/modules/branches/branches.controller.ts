import type { Request, RequestHandler } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from "../../utils/response.js";
import type {
  BranchStatusDto,
  CreateBranchDto,
  UpdateBranchDto,
} from "./branches.dto.js";
import type { BranchesService } from "./branches.service.js";
import {
  branchIdParamSchema,
  listBranchesQuerySchema,
} from "./branches.validator.js";

function parseBranchId(req: Request): string {
  return branchIdParamSchema.parse(req.params).id;
}

export class BranchesController {
  constructor(private readonly service: BranchesService) {}

  /** GET /branches */
  list: RequestHandler = asyncHandler(async (req, res) => {
    const query = listBranchesQuerySchema.parse(req.query);
    const result = await this.service.list(query);
    sendPaginated(res, { branches: result.branches }, result.meta);
  });

  /** POST /branches */
  create: RequestHandler = asyncHandler(async (req, res) => {
    const branch = await this.service.create(req.body as CreateBranchDto);
    sendCreated(res, { branch }, "Branch created successfully");
  });

  /** GET /branches/:id */
  getById: RequestHandler = asyncHandler(async (req, res) => {
    const branch = await this.service.getById(parseBranchId(req));
    sendSuccess(res, { branch });
  });

  /** PATCH /branches/:id */
  update: RequestHandler = asyncHandler(async (req, res) => {
    const branch = await this.service.update(
      parseBranchId(req),
      req.body as UpdateBranchDto,
    );
    sendSuccess(res, { branch }, "Branch updated successfully");
  });

  /** PATCH /branches/:id/status */
  changeStatus: RequestHandler = asyncHandler(async (req, res) => {
    const { isActive } = req.body as BranchStatusDto;
    const branch = await this.service.changeStatus(parseBranchId(req), isActive);
    sendSuccess(res, { branch }, `Branch ${isActive ? "enabled" : "disabled"}`);
  });

  /** DELETE /branches/:id */
  remove: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.delete(parseBranchId(req));
    sendNoContent(res);
  });
}
