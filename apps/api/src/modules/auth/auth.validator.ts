import type { RequestHandler } from "express";
import { z } from "zod";

// ==================== Schemas ====================

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a digit");

export const loginSchema = z.object({
  email: z.email("Invalid email").toLowerCase().trim(),
  password: z.string().min(1, "Password is required").max(128),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(128),
    newPassword: passwordSchema,
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email").toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32, "Invalid token").max(256),
  newPassword: passwordSchema,
});

export const revokeSessionSchema = z.object({
  sessionId: z.string().min(1, "Session id is required"),
});

// ==================== Middleware Factory ====================

/**
 * يتحقق من body ويستبدله بالنسخة المُنقّاة
 * أخطاء Zod تذهب للمعالج المركزي (400 + تفاصيل)
 */
export function validateBody(schema: z.ZodType): RequestHandler {
  return (req, _res, next): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}
