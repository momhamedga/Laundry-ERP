import { z } from "zod";
import type { UpdateProfileInput } from "@/types/profile";

/**
 * تحقق مطابق لـ updateProfileSchema بـ apps/api/src/modules/users/users.validator.ts
 * (طبقة دفاع أولى بالواجهة - المصدر الحقيقي يبقى الخادم). لا بريد/دور/فرع/حالة هنا عمداً.
 */
const nameSchema = z
  .string()
  .trim()
  .min(2, "الاسم قصير جداً (حرفان على الأقل)")
  .max(100, "الاسم طويل جداً");

const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\+?[0-9]{7,15}$/.test(v), "رقم هاتف غير صالح");

export const profileFormSchema = z.object({
  name: nameSchema,
  phone: optionalPhone,
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function toUpdateProfileInput(values: ProfileFormValues): UpdateProfileInput {
  return {
    name: values.name,
    phone: values.phone.trim() === "" ? null : values.phone.trim(),
  };
}
