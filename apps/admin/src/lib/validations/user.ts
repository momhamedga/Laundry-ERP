import { z } from "zod";
import type { UserRole } from "@/types";
import type { CreateUserInput, UpdateUserInput } from "@/types/user";

/**
 * تحقق مطابق لقواعد apps/api/src/modules/users/users.validator.ts
 * (طبقة دفاع أولى بالواجهة - المصدر الحقيقي يبقى الخادم)
 */
const nameSchema = z.string().trim().min(2, "الاسم قصير جداً (حرفان على الأقل)").max(100, "الاسم طويل جداً");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => z.email().safeParse(v).success, "بريد إلكتروني غير صالح");

/** حقل هاتف اختياري: فارغ مسموح، وإلا يجب مطابقة صيغة الخادم */
const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\+?[0-9]{7,15}$/.test(v), "رقم هاتف غير صالح");

const passwordSchema = z
  .string()
  .min(8, "٨ أحرف على الأقل")
  .max(128, "طويلة جداً")
  .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير")
  .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير")
  .regex(/[0-9]/, "يجب أن تحتوي على رقم");

const ROLES: readonly UserRole[] = ["ADMIN", "MANAGER", "CASHIER", "WORKER", "DELIVERY"];
const roleSchema = z.enum(ROLES as [UserRole, ...UserRole[]]);

/** "none" = بلا فرع - قيمة تحكم بالواجهة فقط، لا تُرسل كما هي للخادم */
const branchFieldSchema = z.string();

export const createUserFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema,
  phone: optionalPhone,
  branchId: branchFieldSchema,
});

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;

export const editUserFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: optionalPhone,
  branchId: branchFieldSchema,
  role: roleSchema,
});

export type EditUserFormValues = z.infer<typeof editUserFormSchema>;

export const resetPasswordFormSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "كلمتا السر غير متطابقتين",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

function branchIdFromField(value: string): string | null {
  return value === "" || value === "none" ? null : value;
}

export function toCreateUserInput(values: CreateUserFormValues): CreateUserInput {
  return {
    name: values.name,
    email: values.email,
    password: values.password,
    role: values.role,
    phone: values.phone.trim() === "" ? undefined : values.phone.trim(),
    branchId: branchIdFromField(values.branchId),
  };
}

/** لا يتضمن role - يُرسَل عبر assignUserRole المنفصل (Endpoint مختلف بالخادم) */
export function toUpdateUserInput(values: EditUserFormValues): UpdateUserInput {
  return {
    name: values.name,
    email: values.email,
    phone: values.phone.trim() === "" ? null : values.phone.trim(),
    branchId: branchIdFromField(values.branchId),
  };
}
