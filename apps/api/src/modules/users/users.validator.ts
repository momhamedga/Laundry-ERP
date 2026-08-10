import { UserRole } from "@prisma/client";
import { z } from "zod";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  SORT_ORDERS,
  USER_SORTABLE_FIELDS,
} from "./users.constants.js";

/**
 * قواعد كلمة السر - مطابقة لسياسة auth
 * (مكررة عمداً: auth module لا يُعدل ولا يصدّرها)
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a digit");

const nameSchema = z.string().trim().min(2, "Name too short").max(100);
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, "Invalid phone number");

// ==================== Params ====================

export const userIdParamSchema = z.object({
  id: z.cuid("Invalid user id"),
});

// ==================== Body ====================

export const createUserSchema = z.object({
  name: nameSchema,
  email: z.email("Invalid email").toLowerCase().trim(),
  password: passwordSchema,
  role: z.enum(UserRole).default("CASHIER"),
  phone: phoneSchema.optional(),
  branchId: z.cuid("Invalid branch id").nullish(),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z
  .object({
    name: nameSchema,
    email: z.email("Invalid email").toLowerCase().trim(),
    phone: phoneSchema.nullable(),
    branchId: z.cuid("Invalid branch id").nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "لا توجد حقول للتعديل." });

/** الحقول التي يملك المستخدم تعديلها في ملفه الشخصي فقط */
export const updateProfileSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema.nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "لا توجد حقول للتعديل." });

export const changeStatusSchema = z.object({
  isActive: z.boolean(),
});

export const assignRoleSchema = z.object({
  role: z.enum(UserRole),
});

export const adminResetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

// ==================== Query ====================

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  role: z.enum(UserRole).optional(),
  // من query string تصل كنص - تحويل صريح (z.coerce.boolean يعتبر "false" صحيحاً!)
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  branchId: z.cuid().optional(),
  sortBy: z.enum(USER_SORTABLE_FIELDS).default("createdAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});

export const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
