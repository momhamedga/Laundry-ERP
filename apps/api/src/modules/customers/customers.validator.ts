import { z } from "zod";
import {
  CUSTOMER_SORTABLE_FIELDS,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  SORT_ORDERS,
} from "./customers.constants.js";

const nameSchema = z.string().trim().min(2, "Name too short").max(100);
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, "Invalid phone number");
const notesSchema = z.string().trim().max(1000, "Notes too long");

// ==================== Params ====================

export const customerIdParamSchema = z.object({
  id: z.cuid("Invalid customer id"),
});

export const customerPhoneParamSchema = z.object({
  phone: phoneSchema,
});

// ==================== Body ====================

export const createCustomerSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: z.email("Invalid email").toLowerCase().trim().nullish(),
  address: z.string().trim().max(300).nullish(),
  notes: notesSchema.nullish(),
});

export const updateCustomerSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    email: z.email("Invalid email").toLowerCase().trim().nullable(),
    address: z.string().trim().max(300).nullable(),
    notes: notesSchema.nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

export const updateNotesSchema = z.object({
  notes: notesSchema.nullable(),
});

/** Merge Duplicate Customers - Structure فقط */
export const mergeCustomersSchema = z
  .object({
    /** العميل الذي ستُنقل بياناته ثم يُعطل */
    sourceId: z.cuid("Invalid source customer id"),
    /** العميل الذي سيستقبل البيانات */
    targetId: z.cuid("Invalid target customer id"),
  })
  .refine((d) => d.sourceId !== d.targetId, {
    message: "Source and target must be different customers",
    path: ["targetId"],
  });

// ==================== Query ====================

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  /** البحث في الاسم / الهاتف / البريد */
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  // من query string تصل كنص - تحويل صريح (z.coerce.boolean يعتبر "false" صحيحاً!)
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  /** فلترة بفترة الإنشاء */
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  sortBy: z.enum(CUSTOMER_SORTABLE_FIELDS).default("createdAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});
