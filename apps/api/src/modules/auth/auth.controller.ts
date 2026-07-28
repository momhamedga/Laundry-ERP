import type { Request, RequestHandler, Response } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendNoContent, sendSuccess } from "../../utils/response.js";
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  RevokeSessionDto,
} from "./auth.dto.js";
import type { AuthService } from "./auth.service.js";
import type { AuthenticatedUser } from "./auth.types.js";
import {
  clearRefreshCookie,
  getRequestContext,
  readRefreshCookie,
  setRefreshCookie,
} from "./auth.utils.js";

/** يضمن وجود req.user - تُستدعى فقط بعد authenticate */
function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "Authentication required");
  return req.user;
}

export class AuthController {
  constructor(private readonly service: AuthService) {}

  /** POST /login - الـ refresh token يُرسل كـ HttpOnly Cookie فقط */
  login: RequestHandler = asyncHandler(async (req, res) => {
    const result = await this.service.login(
      req.body as LoginDto,
      getRequestContext(req),
    );

    setRefreshCookie(res, result.tokens.refreshToken);
    sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.tokens.accessToken,
        expiresInSec: result.tokens.accessTokenExpiresInSec,
      },
      "Logged in successfully",
    );
  });

  /** POST /refresh - Rotation: كوكي جديد + access token جديد */
  refresh: RequestHandler = asyncHandler(async (req, res: Response) => {
    const rawToken = readRefreshCookie(req);
    if (!rawToken) throw new ApiError(401, "Refresh token missing");

    try {
      const tokens = await this.service.refresh(rawToken, getRequestContext(req));
      setRefreshCookie(res, tokens.refreshToken);
      sendSuccess(res, {
        accessToken: tokens.accessToken,
        expiresInSec: tokens.accessTokenExpiresInSec,
      });
    } catch (err) {
      clearRefreshCookie(res); // توكين غير صالح → نظّف الكوكي
      throw err;
    }
  });

  /** POST /logout */
  logout: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.logout(readRefreshCookie(req), getRequestContext(req));
    clearRefreshCookie(res);
    sendSuccess(res, null, "Logged out successfully");
  });

  /** GET /me */
  me: RequestHandler = asyncHandler(async (req, res) => {
    const user = await this.service.getCurrentUser(requireUser(req).id);
    sendSuccess(res, { user });
  });

  /** POST /change-password - يُبطل كل الجلسات */
  changePassword: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.changePassword(
      requireUser(req).id,
      req.body as ChangePasswordDto,
      getRequestContext(req),
    );
    clearRefreshCookie(res);
    sendSuccess(res, null, "Password changed. Please log in again");
  });

  /** POST /forgot-password - استجابة موحدة دائماً */
  forgotPassword: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.forgotPassword(
      req.body as ForgotPasswordDto,
      getRequestContext(req),
    );
    sendSuccess(res, null, "If the email exists, a reset link has been sent");
  });

  /** POST /reset-password */
  resetPassword: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.resetPassword(
      req.body as ResetPasswordDto,
      getRequestContext(req),
    );
    sendSuccess(res, null, "Password has been reset. Please log in");
  });

  /** GET /sessions - الجلسات النشطة للمستخدم الحالي */
  listSessions: RequestHandler = asyncHandler(async (req, res) => {
    const sessions = await this.service.listSessions(
      requireUser(req).id,
      readRefreshCookie(req),
    );
    sendSuccess(res, { sessions });
  });

  /** DELETE /sessions - إبطال جلسة محددة */
  revokeSession: RequestHandler = asyncHandler(async (req, res) => {
    const { sessionId } = req.body as RevokeSessionDto;
    await this.service.revokeSession(
      requireUser(req).id,
      sessionId,
      getRequestContext(req),
    );
    sendNoContent(res);
  });
}
