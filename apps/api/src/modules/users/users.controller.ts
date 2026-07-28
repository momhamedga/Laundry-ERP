import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from "../../utils/response.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type {
  AdminResetPasswordDto,
  AssignRoleDto,
  ChangeStatusDto,
  CreateUserDto,
  UpdateProfileDto,
  UpdateUserDto,
} from "./users.dto.js";
import type { UsersService } from "./users.service.js";
import {
  activityQuerySchema,
  listUsersQuerySchema,
  userIdParamSchema,
} from "./users.validator.js";

/** يضمن وجود req.user - تُستدعى فقط بعد authenticate */
function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "Authentication required");
  return req.user;
}

/** التحقق من :id في المسار (cuid) */
function parseUserId(req: Request): string {
  return userIdParamSchema.parse(req.params).id;
}

export class UsersController {
  constructor(private readonly service: UsersService) {}

  /** GET /users - قائمة مع ترقيم/بحث/فلاتر/ترتيب */
  list: RequestHandler = asyncHandler(async (req, res) => {
    // query تُتحقق هنا (Express 5 يمنع إعادة تعيين req.query في middleware)
    const query = listUsersQuerySchema.parse(req.query);
    const result = await this.service.list(query);
    sendPaginated(res, { users: result.users }, result.meta);
  });

  /** POST /users */
  create: RequestHandler = asyncHandler(async (req, res) => {
    const user = await this.service.create(req.body as CreateUserDto, requireUser(req));
    sendCreated(res, { user }, "User created successfully");
  });

  /** GET /users/:id - مع آخر دخول وعدد الجلسات النشطة */
  getById: RequestHandler = asyncHandler(async (req, res) => {
    const details = await this.service.getById(parseUserId(req));
    sendSuccess(res, details);
  });

  /** PATCH /users/:id */
  update: RequestHandler = asyncHandler(async (req, res) => {
    const user = await this.service.update(parseUserId(req), req.body as UpdateUserDto);
    sendSuccess(res, { user }, "User updated successfully");
  });

  /** DELETE /users/:id - Soft Delete */
  remove: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.softDelete(parseUserId(req), requireUser(req).id);
    sendNoContent(res);
  });

  /** PATCH /users/:id/status */
  changeStatus: RequestHandler = asyncHandler(async (req, res) => {
    const { isActive } = req.body as ChangeStatusDto;
    const user = await this.service.changeStatus(
      parseUserId(req),
      isActive,
      requireUser(req).id,
    );
    sendSuccess(res, { user }, `User ${isActive ? "activated" : "deactivated"}`);
  });

  /** PATCH /users/:id/role */
  assignRole: RequestHandler = asyncHandler(async (req, res) => {
    const { role } = req.body as AssignRoleDto;
    const user = await this.service.assignRole(
      parseUserId(req),
      role,
      requireUser(req).id,
    );
    sendSuccess(res, { user }, "Role assigned successfully");
  });

  /** POST /users/:id/reset-password - يُبطل كل جلسات المستخدم */
  adminResetPassword: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.adminResetPassword(
      parseUserId(req),
      req.body as AdminResetPasswordDto,
    );
    sendSuccess(res, null, "Password reset. User must log in again");
  });

  /** GET /users/:id/activity - سجل النشاط من AuditLog */
  getActivity: RequestHandler = asyncHandler(async (req, res) => {
    const query = activityQuerySchema.parse(req.query);
    const result = await this.service.getActivity(parseUserId(req), query);
    sendPaginated(res, { activity: result.activity }, result.meta);
  });

  // ==================== Profile (Self-service) ====================

  /** GET /users/profile */
  getProfile: RequestHandler = asyncHandler(async (req, res) => {
    const details = await this.service.getProfile(requireUser(req).id);
    sendSuccess(res, details);
  });

  /** PATCH /users/profile */
  updateProfile: RequestHandler = asyncHandler(async (req, res) => {
    const user = await this.service.updateProfile(
      requireUser(req).id,
      req.body as UpdateProfileDto,
    );
    sendSuccess(res, { user }, "Profile updated successfully");
  });

  /** POST /users/profile/avatar - Structure فقط (Cloudinary لاحقاً) */
  uploadAvatar: RequestHandler = asyncHandler(async (_req, _res) => {
    this.service.uploadAvatar();
  });
}
