import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type {
  AdjustDto,
  BonusDto,
  CreateCampaignDto,
  RedeemDto,
  UpdateCampaignDto,
  UpdateSettingsDto,
} from "./loyalty.dto.js";
import type { LoyaltyService } from "./loyalty.service.js";
import {
  adjustSchema,
  bonusSchema,
  campaignIdParamSchema,
  customerIdParamSchema,
  historyQuerySchema,
  listAccountsQuerySchema,
  listCampaignsQuerySchema,
  redeemQuerySchema,
  redeemSchema,
} from "./loyalty.validator.js";

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "يلزم تسجيل الدخول للمتابعة.");
  return req.user;
}

export class LoyaltyController {
  constructor(private readonly service: LoyaltyService) {}

  // Read
  accounts: RequestHandler = asyncHandler(async (req, res) => {
    const query = listAccountsQuerySchema.parse(req.query);
    const { accounts, meta } = await this.service.listAccounts(query);
    sendPaginated(res, { accounts }, meta);
  });
  summary: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = customerIdParamSchema.parse(req.params);
    const summary = await this.service.getSummary(id);
    sendSuccess(res, { summary });
  });
  history: RequestHandler = asyncHandler(async (req, res) => {
    const query = historyQuerySchema.parse(req.query);
    const { transactions, meta } = await this.service.listHistory(query);
    sendPaginated(res, { transactions }, meta);
  });
  stats: RequestHandler = asyncHandler(async (_req, res) => {
    sendSuccess(res, { stats: await this.service.getStats() });
  });

  // Settings
  getSettings: RequestHandler = asyncHandler(async (_req, res) => {
    sendSuccess(res, { settings: await this.service.getSettings() });
  });
  updateSettings: RequestHandler = asyncHandler(async (req, res) => {
    const settings = await this.service.updateSettings(req.body as UpdateSettingsDto, requireUser(req), getRequestContext(req));
    sendSuccess(res, { settings }, "Loyalty settings updated");
  });

  // Points operations
  redeemQuote: RequestHandler = asyncHandler(async (req, res) => {
    const query = redeemQuerySchema.parse(req.query);
    sendSuccess(res, { quote: await this.service.redeemQuote(query) });
  });
  redeem: RequestHandler = asyncHandler(async (req, res) => {
    const result = await this.service.redeem(req.body as RedeemDto, requireUser(req), getRequestContext(req));
    sendSuccess(res, { result }, "Points redeemed");
  });
  adjust: RequestHandler = asyncHandler(async (req, res) => {
    const summary = await this.service.adjust(req.body as AdjustDto, requireUser(req), getRequestContext(req));
    sendSuccess(res, { summary }, "Points adjusted");
  });
  bonus: RequestHandler = asyncHandler(async (req, res) => {
    const summary = await this.service.grantBonus(req.body as BonusDto, requireUser(req), getRequestContext(req));
    sendSuccess(res, { summary }, "Bonus granted");
  });
  expire: RequestHandler = asyncHandler(async (req, res) => {
    const result = await this.service.expirePoints(requireUser(req), getRequestContext(req));
    sendSuccess(res, result, `Expired ${result.expiredPoints} points`);
  });

  // Campaigns
  listCampaigns: RequestHandler = asyncHandler(async (req, res) => {
    const query = listCampaignsQuerySchema.parse(req.query);
    const { campaigns, meta } = await this.service.listCampaigns(query);
    sendPaginated(res, { campaigns }, meta);
  });
  createCampaign: RequestHandler = asyncHandler(async (req, res) => {
    const campaign = await this.service.createCampaign(req.body as CreateCampaignDto, requireUser(req), getRequestContext(req));
    sendCreated(res, { campaign }, "Campaign created");
  });
  updateCampaign: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = campaignIdParamSchema.parse(req.params);
    const campaign = await this.service.updateCampaign(id, req.body as UpdateCampaignDto, requireUser(req), getRequestContext(req));
    sendSuccess(res, { campaign }, "Campaign updated");
  });
  deleteCampaign: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = campaignIdParamSchema.parse(req.params);
    await this.service.deleteCampaign(id, requireUser(req), getRequestContext(req));
    sendNoContent(res);
  });
}
