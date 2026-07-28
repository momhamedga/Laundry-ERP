import { z } from "zod";
import type { CreateBranchInput, UpdateBranchInput } from "@/types/branch";

/**
 * تحقق مطابق لقواعد apps/api/src/modules/branches/branches.validator.ts
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

const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || phoneSchema.safeParse(v).success, "رقم هاتف غير صالح");

const optionalAddress = z.string().trim().max(300, "العنوان طويل جداً");

export const branchFormSchema = z.object({
  name: nameSchema,
  address: optionalAddress,
  phone: optionalPhone,
});

export type BranchFormValues = z.infer<typeof branchFormSchema>;

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function toCreateBranchInput(values: BranchFormValues): CreateBranchInput {
  return {
    name: values.name,
    address: emptyToNull(values.address),
    phone: emptyToNull(values.phone),
  };
}

export function toUpdateBranchInput(values: BranchFormValues): UpdateBranchInput {
  return {
    name: values.name,
    address: emptyToNull(values.address),
    phone: emptyToNull(values.phone),
  };
}
