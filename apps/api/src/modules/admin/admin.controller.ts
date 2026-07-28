import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendNoContent, sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { AdminService } from "./admin.service.js";
import {
  copyPermissionsSchema,
  forceLogoutSchema,
  listLoginHistoryQuerySchema,
  removeOverrideSchema,
  sessionIdParamSchema,
  setOverrideSchema,
  userIdParamSchema,
} from "./admin.validator.js";

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "Authentication required");
  return req.user;
}

export class AdminController {
  constructor(private readonly service: AdminService) {}

  securityCenter: RequestHandler = asyncHandler(async (_req, res) => {
    sendSuccess(res, { securityCenter: await this.service.getSecurityCenter() });
  });

  loginHistory: RequestHandler = asyncHandler(async (req, res) => {
    const query = listLoginHistoryQuerySchema.parse(req.query);
    const { entries, meta } = await this.service.listLoginHistory(query);
    sendPaginated(res, { entries }, meta);
  });

  userSessions: RequestHandler = asyncHandler(async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    sendSuccess(res, { sessions: await this.service.getUserSessions(userId) });
  });

  killSession: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { sessionId } = sessionIdParamSchema.parse(req.params);
    await this.service.killSession(user, getRequestContext(req), sessionId);
    sendNoContent(res);
  });

  forceLogout: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const dto = forceLogoutSchema.parse(req.body);
    const result = await this.service.forceLogout(user, getRequestContext(req), dto);
    sendSuccess(res, { result }, "تم الإخراج القسري");
  });

  permissionMatrix: RequestHandler = asyncHandler(async (_req, res) => {
    sendSuccess(res, { matrix: this.service.getPermissionMatrix() });
  });

  // ==================== Phase 9.6c ====================

  userPermissions: RequestHandler = asyncHandler(async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    sendSuccess(res, { permissions: await this.service.getUserPermissions(userId) });
  });

  setOverride: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { userId } = userIdParamSchema.parse(req.params);
    const dto = setOverrideSchema.parse(req.body);
    await this.service.setOverride(user, getRequestContext(req), userId, dto.permission, dto.granted);
    sendSuccess(res, { permissions: await this.service.getUserPermissions(userId) }, "تم حفظ التجاوز");
  });

  removeOverride: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { userId } = userIdParamSchema.parse(req.params);
    const dto = removeOverrideSchema.parse(req.body);
    await this.service.removeOverride(user, getRequestContext(req), userId, dto.permission);
    sendSuccess(res, { permissions: await this.service.getUserPermissions(userId) }, "تمت إزالة التجاوز");
  });

  copyPermissions: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { userId } = userIdParamSchema.parse(req.params);
    const dto = copyPermissionsSchema.parse(req.body);
    await this.service.copyPermissions(user, getRequestContext(req), userId, dto.sourceUserId);
    sendSuccess(res, { permissions: await this.service.getUserPermissions(userId) }, "تم نسخ الصلاحيات");
  });

  impersonate: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { userId } = userIdParamSchema.parse(req.params);
    const result = await this.service.impersonate(user, getRequestContext(req), userId);
    sendSuccess(res, result, "تم الدخول كمستخدم");
  });

  stopImpersonation: RequestHandler = asyncHandler(async (req, res) => {
    const user = requireUser(req);
    await this.service.stopImpersonation(user, getRequestContext(req));
    sendSuccess(res, { stopped: true }, "تم إنهاء الانتحال");
  });
}
