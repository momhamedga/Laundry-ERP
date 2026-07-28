import { z } from "zod";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./admin.constants.js";

export const userIdParamSchema = z.object({ userId: z.cuid("Invalid user id") });
export const sessionIdParamSchema = z.object({ sessionId: z.cuid("Invalid session id") });

/** تعيين تجاوز صلاحية لمستخدم (granted=منح/سحب) - Phase 9.6c */
export const setOverrideSchema = z.object({
  permission: z.string().trim().min(1).max(60),
  granted: z.coerce.boolean(),
});

export const removeOverrideSchema = z.object({
  permission: z.string().trim().min(1).max(60),
});

/** نسخ تجاوزات/صلاحيات مستخدم مصدر إلى الحالي (كتجاوزات) */
export const copyPermissionsSchema = z.object({
  sourceUserId: z.cuid(),
});

export const listLoginHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  userId: z.cuid().optional(),
  action: z.string().trim().max(60).optional(),
});

/**
 * الإخراج القسري - نطاق واحد: مستخدم بعينه، أو كل مستخدمي فرع، أو الجميع.
 * user يتطلب userId، branch يتطلب branchId (يُفرض بالخدمة).
 */
export const forceLogoutSchema = z
  .object({
    scope: z.enum(["user", "branch", "all"]),
    userId: z.cuid().optional(),
    branchId: z.cuid().optional(),
  })
  .refine((d) => d.scope !== "user" || !!d.userId, {
    message: "userId مطلوب عند النطاق user",
    path: ["userId"],
  })
  .refine((d) => d.scope !== "branch" || !!d.branchId, {
    message: "branchId مطلوب عند النطاق branch",
    path: ["branchId"],
  });
