import type { RequestHandler } from "express";
import {
  ROLE_PERMISSIONS,
  type Permission,
} from "../modules/auth/auth.constants.js";
import { ApiError } from "./error.middleware.js";

/**
 * Permission-based Access Control - أدق من الأدوار
 * يجب أن يسبقه authenticate
 *
 * @example router.get("/reports", authenticate, requirePermission("reports:view"))
 */
export function requirePermission(...required: readonly Permission[]): RequestHandler {
  return (req, _res, next): void => {
    if (!req.user) {
      next(new ApiError(401, "Authentication required"));
      return;
    }

    // Phase 9.6c - الصلاحيات الفعلية (الدور + التجاوزات) إن حُسبت بـauthenticate،
    // وإلا رجوع لخريطة الدور (متوافق رجعياً مع أي مسار لا يمرّ بالتجاوزات)
    const granted: readonly string[] = req.user.permissions ?? ROLE_PERMISSIONS[req.user.role];
    const missing = required.filter((p) => !granted.includes(p));

    if (missing.length > 0) {
      next(new ApiError(403, `Missing permissions: ${missing.join(", ")}`));
      return;
    }
    next();
  };
}
