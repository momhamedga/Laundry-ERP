import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { ManualLevelDto, UpdateTierDto } from "./membership.dto.js";
import type { MembershipService } from "./membership.service.js";
import { levelParamSchema, manualLevelSchema } from "./membership.validator.js";

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "يلزم تسجيل الدخول للمتابعة.");
  return req.user;
}

export class MembershipController {
  constructor(private readonly service: MembershipService) {}

  listTiers: RequestHandler = asyncHandler(async (_req, res) => {
    const tiers = await this.service.listTiers();
    sendSuccess(res, { tiers });
  });

  distribution: RequestHandler = asyncHandler(async (_req, res) => {
    const distribution = await this.service.distribution();
    sendSuccess(res, { distribution });
  });

  updateTier: RequestHandler = asyncHandler(async (req, res) => {
    const { level } = levelParamSchema.parse(req.params);
    const tier = await this.service.updateTier(
      level,
      req.body as UpdateTierDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { tier }, "Tier updated");
  });

  setLevel: RequestHandler = asyncHandler(async (req, res) => {
    const dto = manualLevelSchema.parse(req.body) as ManualLevelDto;
    const result = await this.service.manualSetLevel(dto, requireUser(req), getRequestContext(req));
    sendSuccess(res, { result }, "Membership level updated");
  });
}
