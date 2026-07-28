import { z } from "zod";
import type { ChangePasswordInput } from "@/types/change-password";

/**
 * تحقق مطابق لـ changePasswordSchema بـ apps/api/src/modules/auth/auth.validator.ts
 * (طبقة دفاع أولى بالواجهة - المصدر الحقيقي يبقى الخادم). القواعد الثلاث
 * (طول 8، حرف كبير، حرف صغير، رقم) + "يجب أن تختلف عن الحالية" منسوخة حرفياً
 * من الخادم - لا حرف خاص إلزامي (Requirement)، فقط كمعيار قوة اختياري إضافي.
 */
const passwordSchema = z
  .string()
  .min(8, "٨ أحرف على الأقل")
  .max(128, "طويلة جداً")
  .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير")
  .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير")
  .regex(/[0-9]/, "يجب أن تحتوي على رقم");

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "كلمة السر الحالية مطلوبة").max(128, "طويلة جداً"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "تأكيد كلمة السر مطلوب"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "كلمتا السر غير متطابقتين",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "كلمة السر الجديدة يجب أن تختلف عن الحالية",
    path: ["newPassword"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

export function toChangePasswordInput(values: ChangePasswordFormValues): ChangePasswordInput {
  return { currentPassword: values.currentPassword, newPassword: values.newPassword };
}

// ==================== Password Strength (بلا مكتبة خارجية) ====================

export type PasswordStrengthLevel = "empty" | "weak" | "medium" | "strong";

export const PASSWORD_STRENGTH_LABELS: Record<PasswordStrengthLevel, string> = {
  empty: "",
  weak: "ضعيفة",
  medium: "متوسطة",
  strong: "قوية",
};

/** معيار heuristic للعرض فقط - يشمل الحرف الخاص كنقطة إضافية (غير إلزامي بالخادم) */
export function computePasswordStrength(password: string): PasswordStrengthLevel {
  if (password.length === 0) return "empty";

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return "weak";
  if (score <= 4) return "medium";
  return "strong";
}

// ==================== Requirements Checklist (قواعد الخادم الإلزامية فقط) ====================

export interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: readonly PasswordRequirement[] = [
  { id: "length", label: "٨ أحرف على الأقل", test: (p) => p.length >= 8 },
  { id: "lowercase", label: "حرف صغير (a-z)", test: (p) => /[a-z]/.test(p) },
  { id: "uppercase", label: "حرف كبير (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "digit", label: "رقم (0-9)", test: (p) => /[0-9]/.test(p) },
];
