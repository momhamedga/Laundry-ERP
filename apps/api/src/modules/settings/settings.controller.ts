import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { UpdateSettingsDto } from "./settings.dto.js";
import type { SettingsService } from "./settings.service.js";

/** يضمن وجود req.user - تُستدعى فقط بعد authenticate */
function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "يلزم تسجيل الدخول للمتابعة.");
  return req.user;
}

export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  /** GET /settings */
  get: RequestHandler = asyncHandler(async (req, res) => {
    const settings = await this.service.get();
    sendSuccess(res, { settings });
  });

  /** PUT /settings */
  update: RequestHandler = asyncHandler(async (req, res) => {
    const settings = await this.service.update(
      req.body as UpdateSettingsDto,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { settings }, "Settings updated successfully");
  });
}
