import type { RequestHandler } from "express";
import type { UserRole } from "@prisma/client";
import { ApiError } from "./error.middleware.js";

/**
 * RBAC - يسمح فقط للأدوار المحددة
 * يجب أن يسبقه authenticate
 *
 * @example router.delete("/users/:id", authenticate, requireRole("ADMIN"))
 */
export function requireRole(...roles: readonly UserRole[]): RequestHandler {
  return (req, _res, next): void => {
    if (!req.user) {
      next(new ApiError(401, "Authentication required"));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, "Insufficient role privileges"));
      return;
    }
    next();
  };
}
