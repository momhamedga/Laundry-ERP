import { z } from "zod";
import type { CreateServiceInput, ServiceMutationInput } from "@/types/service";

/**
 * تحقق مطابق لـ apps/api/src/modules/services/services.validator.ts
 * الحقول الرقمية نصوص خام (تُحوَّل عند الإرسال) - يتجنب مشاكل أنواع
 * z.coerce مع useForm (input=unknown يتعارض مع generic صارم)
 */
const nameSchema = z.string().trim().min(2, "الاسم قصير جداً").max(100, "الاسم طويل جداً");
const optionalDescription = z.string().trim().max(500, "الوصف طويل جداً");
const categoryIdSchema = z.string().trim().min(1, "التصنيف مطلوب");
const unitSchema = z.enum(["PIECE", "KG", "FIXED"]);

/** يقبل رقماً عشرياً غير سالب بمنزلتين كحد أقصى */
const priceSchema = z
  .string()
  .trim()
  .refine(
    (v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 1_000_000,
    "سعر غير صالح (رقم غير سالب، منزلتان عشريتان كحد أقصى)",
  );

const sortOrderSchema = z
  .string()
  .trim()
  .refine((v) => /^\d+$/.test(v), "رقم صحيح غير سالب فقط");

/** فارغ = بلا مدة، وإلا رقم صحيح موجب (١-٣٣٦ ساعة) */
const estimatedHoursSchema = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 336),
    "مدة غير صالحة (١-٣٣٦ ساعة)",
  );

export const serviceFormSchema = z.object({
  name: nameSchema,
  description: optionalDescription,
  categoryId: categoryIdSchema,
  unit: unitSchema,
  price: priceSchema,
  estimatedHours: estimatedHoursSchema,
  sortOrder: sortOrderSchema,
  isActive: z.boolean(),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export function toServiceInput(values: ServiceFormValues): ServiceMutationInput {
  return {
    name: values.name,
    description: values.description.trim() || null,
    categoryId: values.categoryId,
    unit: values.unit,
    price: Number(values.price),
    estimatedHours: values.estimatedHours.trim() === "" ? null : Number(values.estimatedHours),
    sortOrder: Number(values.sortOrder),
  };
}

export function toCreateServiceInput(values: ServiceFormValues): CreateServiceInput {
  return { ...toServiceInput(values), isActive: values.isActive };
}
