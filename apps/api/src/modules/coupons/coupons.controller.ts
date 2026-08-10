import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type {
  CreateCouponDto,
  RedeemCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from "./coupons.dto.js";
import type { CouponsService } from "./coupons.service.js";
import {
  couponIdParamSchema,
  listCouponsQuerySchema,
  validateCouponSchema,
} from "./coupons.validator.js";

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "يلزم تسجيل الدخول للمتابعة.");
  return req.user;
}
function parseId(req: Request): string {
  return couponIdParamSchema.parse(req.params).id;
}

export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  list: RequestHandler = asyncHandler(async (req, res) => {
    const query = listCouponsQuerySchema.parse(req.query);
    const { coupons, meta } = await this.service.list(query);
    sendPaginated(res, { coupons }, meta);
  });
  stats: RequestHandler = asyncHandler(async (_req, res) => {
    sendSuccess(res, { stats: await this.service.getStats() });
  });
  getById: RequestHandler = asyncHandler(async (req, res) => {
    sendSuccess(res, { coupon: await this.service.getById(parseId(req)) });
  });
  create: RequestHandler = asyncHandler(async (req, res) => {
    const coupon = await this.service.create(req.body as CreateCouponDto, requireUser(req), getRequestContext(req));
    sendCreated(res, { coupon }, "Coupon created");
  });
  update: RequestHandler = asyncHandler(async (req, res) => {
    const coupon = await this.service.update(parseId(req), req.body as UpdateCouponDto, requireUser(req), getRequestContext(req));
    sendSuccess(res, { coupon }, "Coupon updated");
  });
  remove: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.remove(parseId(req), requireUser(req), getRequestContext(req));
    sendNoContent(res);
  });

  validate: RequestHandler = asyncHandler(async (req, res) => {
    const dto = validateCouponSchema.parse(req.body) as ValidateCouponDto;
    const validation = await this.service.validate(dto);
    sendSuccess(res, { validation });
  });
  redeem: RequestHandler = asyncHandler(async (req, res) => {
    const result = await this.service.redeem(req.body as RedeemCouponDto, requireUser(req), getRequestContext(req));
    sendSuccess(res, { result }, "Coupon redeemed");
  });
}
