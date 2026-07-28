import { z } from "zod";
import type { ForgotPasswordInput, ResetPasswordInput } from "@/types/reset-password";

/**
 * تحقق مطابق حرفياً لـ apps/api/src/modules/auth/auth.validator.ts
 * (forgotPasswordSchema/resetPasswordSchema) - طبقة دفاع أولى بالواجهة،
 * المصدر الحقيقي يبقى الخادم. لا قواعد إضافية غير موجودة بالخادم.
 */
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => z.email().safeParse(v).success, "بريد إلكتروني غير صالح");

export const forgotPasswordFormSchema = z.object({ email: emailSchema });
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

export function toForgotPasswordInput(values: ForgotPasswordFormValues): ForgotPasswordInput {
  return { email: values.email };
}

/** newPassword يطابق passwordSchema بالخادم حرفياً: 8+ حرف، كبير+صغير+رقم */
const passwordSchema = z
  .string()
  .min(8, "٨ أحرف على الأقل")
  .max(128, "طويلة جداً")
  .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير")
  .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير")
  .regex(/[0-9]/, "يجب أن تحتوي على رقم");

/** confirmPassword: Frontend Only بالكامل - لا حقل مطابق له بالخادم إطلاقاً */
export const resetPasswordFormSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "تأكيد كلمة السر مطلوب"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "كلمتا السر غير متطابقتين",
    path: ["confirmPassword"],
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

export function toResetPasswordInput(
  token: string,
  values: ResetPasswordFormValues,
): ResetPasswordInput {
  return { token, newPassword: values.newPassword };
}
