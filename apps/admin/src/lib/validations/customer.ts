import { z } from "zod";
import type { CustomerMutationInput } from "@/types/customer";

/**
 * تحقق مطابق لقواعد apps/api/src/modules/customers/customers.validator.ts
 * (طبقة دفاع أولى بالواجهة - المصدر الحقيقي يبقى الخادم)
 */
const nameSchema = z
  .string()
  .trim()
  .min(2, "الاسم قصير جداً (حرفان على الأقل)")
  .max(100, "الاسم طويل جداً");

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, "رقم هاتف غير صالح");

/** حقل اختياري: فارغ مسموح، وإلا يجب أن يكون بريداً صالحاً */
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === "" || z.email().safeParse(v).success, "بريد إلكتروني غير صالح");

const optionalAddress = z.string().trim().max(300, "العنوان طويل جداً");
const optionalNotes = z.string().trim().max(1000, "الملاحظات طويلة جداً");

export const customerFormSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: optionalEmail,
  address: optionalAddress,
  notes: optionalNotes,
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** تحويل قيم النموذج (نصوص فارغة) إلى Payload الخادم (null) */
export function toCustomerInput(values: CustomerFormValues): CustomerMutationInput {
  return {
    name: values.name,
    phone: values.phone,
    email: emptyToNull(values.email),
    address: emptyToNull(values.address),
    notes: emptyToNull(values.notes),
  };
}
