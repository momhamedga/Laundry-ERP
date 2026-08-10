import { ServiceUnit } from "@prisma/client";
import { z } from "zod";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_ESTIMATED_HOURS,
  MAX_PAGE_SIZE,
  MAX_PRICE,
  MAX_SEARCH_LENGTH,
  SERVICE_SORTABLE_FIELDS,
  SORT_ORDERS,
} from "./services.constants.js";

const nameSchema = z.string().trim().min(2, "Name too short").max(100);
const descriptionSchema = z.string().trim().max(500, "Description too long");

/** Business Rule: السعر لا يقبل القيم السالبة */
const priceSchema = z
  .number()
  .nonnegative("Price cannot be negative")
  .max(MAX_PRICE)
  .multipleOf(0.01, "Price supports at most 2 decimal places");

/** Business Rule: مدة التنفيذ يجب أن تكون أكبر من صفر */
const estimatedHoursSchema = z
  .number()
  .int("Estimated hours must be an integer")
  .positive("Estimated hours must be greater than zero")
  .max(MAX_ESTIMATED_HOURS);

// ==================== Params ====================

export const serviceIdParamSchema = z.object({
  id: z.cuid("Invalid service id"),
});

// ==================== Body ====================

export const createServiceSchema = z.object({
  name: nameSchema,
  description: descriptionSchema.nullish(),
  categoryId: z.cuid("Invalid category id"),
  /** Pricing Type: PIECE / KG / FIXED */
  unit: z.enum(ServiceUnit).default("PIECE"),
  price: priceSchema,
  estimatedHours: estimatedHoursSchema.nullish(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateServiceSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema.nullable(),
    categoryId: z.cuid("Invalid category id"),
    unit: z.enum(ServiceUnit),
    price: priceSchema,
    estimatedHours: estimatedHoursSchema.nullable(),
    sortOrder: z.number().int().min(0),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "لا توجد حقول للتعديل." });

/** Active / Inactive */
export const serviceStatusSchema = z.object({
  isActive: z.boolean(),
});

// ==================== Query ====================

export const listServicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  /** البحث في الاسم والوصف */
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  categoryId: z.cuid().optional(),
  unit: z.enum(ServiceUnit).optional(),
  // من query string تصل كنص - تحويل صريح (z.coerce.boolean يعتبر "false" صحيحاً!)
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sortBy: z.enum(SERVICE_SORTABLE_FIELDS).default("sortOrder"),
  sortOrder: z.enum(SORT_ORDERS).default("asc"),
});
