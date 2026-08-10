import type { RequestHandler } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { computeEffectivePermissions } from "../modules/auth/auth.constants.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "./error.middleware.js";

/**
 * JWT Middleware - يتحقق من Access Token ويرفق المستخدم بالطلب
 *
 * يتحقق أيضاً من قاعدة البيانات أن:
 * - المستخدم ما زال موجوداً ونشطاً
 * - التوكين ليس أقدم من آخر تغيير لكلمة السر (إبطال فوري)
 */
export const authenticate: RequestHandler = asyncHandler(async (req, _res, next) => {
  const header = req.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "يلزم تسجيل الدخول للمتابعة.");
  }

  const payload = verifyAccessToken(header.slice("Bearer ".length).trim());

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      role: true,
      branchId: true,
      isActive: true,
      passwordChangedAt: true,
      // Phase 9.6c - تجاوزات الصلاحيات لدمجها في الصلاحيات الفعلية
      permissionOverrides: { select: { permission: true, granted: true } },
    },
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, "الحساب موقوف أو لم يعد موجوداً.");
  }

  // إبطال التوكينات الصادرة قبل آخر تغيير لكلمة السر
  if (
    user.passwordChangedAt &&
    payload.iat * 1000 < user.passwordChangedAt.getTime()
  ) {
    throw new ApiError(401, "تم تغيير كلمة السر، فانتهت هذه الجلسة. سجّل الدخول من جديد.");
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    branchId: user.branchId,
    permissions: computeEffectivePermissions(user.role, user.permissionOverrides),
    impersonatedBy: payload.imp ?? null,
  };
  next();
});
