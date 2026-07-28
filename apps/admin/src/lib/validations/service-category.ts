import { z } from "zod";
import type { CategoryMutationInput } from "@/types/service-category";

/** تحقق مطابق لـ apps/api/src/modules/service-categories/category.validator.ts */
const nameSchema = z.string().trim().min(2, "الاسم قصير جداً").max(100, "الاسم طويل جداً");

/** نص خام من حقل رقمي - يُحوَّل لرقم عند الإرسال (يتجنب مشاكل أنواع z.coerce مع useForm) */
const sortOrderSchema = z
  .string()
  .trim()
  .refine((v) => /^\d+$/.test(v), "رقم صحيح غير سالب فقط");

export const categoryFormSchema = z.object({
  name: nameSchema,
  sortOrder: sortOrderSchema,
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export function toCategoryInput(values: CategoryFormValues): CategoryMutationInput {
  return { name: values.name, sortOrder: Number(values.sortOrder) };
}
