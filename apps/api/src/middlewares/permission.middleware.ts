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
      next(new ApiError(401, "يلزم تسجيل الدخول للمتابعة."));
      return;
    }

    // Phase 9.6c - الصلاحيات الفعلية (الدور + التجاوزات) إن حُسبت بـauthenticate،
    // وإلا رجوع لخريطة الدور (متوافق رجعياً مع أي مسار لا يمرّ بالتجاوزات)
    const granted: readonly string[] = req.user.permissions ?? ROLE_PERMISSIONS[req.user.role];
    const missing = required.filter((p) => !granted.includes(p));

    if (missing.length > 0) {
      // أسماء الصلاحيات معرّفات داخلية لا تفيد الموظّف وتكشف بنية النظام لمن
      // يستكشفه. تبقى في السجلّ للتشخيص، ويرى المستخدم سبباً مفهوماً فقط.
      console.warn(
        `⛔ صلاحيات ناقصة للمستخدم ${req.user.id}: ${missing.join(", ")}`,
      );
      next(new ApiError(403, "لا تملك صلاحية تنفيذ هذا الإجراء."));
      return;
    }
    next();
  };
}
