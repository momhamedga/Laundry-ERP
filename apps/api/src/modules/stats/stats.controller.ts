import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";
import type { StatsService } from "./stats.service.js";
import { dashboardQuerySchema } from "./stats.validator.js";

export class StatsController {
  constructor(private readonly service: StatsService) {}

  /** GET /stats/dashboard?branchId= */
  dashboard: RequestHandler = asyncHandler(async (req, res) => {
    const { branchId } = dashboardQuerySchema.parse(req.query);
    const stats = await this.service.dashboard(branchId);
    sendSuccess(res, { stats });
  });
}
