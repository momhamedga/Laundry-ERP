import { z } from "zod";
import {
  CATEGORY_SORTABLE_FIELDS,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  SORT_ORDERS,
} from "./category.constants.js";

const nameSchema = z.string().trim().min(2, "Name too short").max(100);

// ==================== Params ====================

export const categoryIdParamSchema = z.object({
  id: z.cuid("Invalid category id"),
});

// ==================== Body ====================

export const createCategorySchema = z.object({
  name: nameSchema,
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCategorySchema = z
  .object({
    name: nameSchema,
    sortOrder: z.number().int().min(0),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "لا توجد حقول للتعديل." });

/** Enable / Disable */
export const categoryStatusSchema = z.object({
  isActive: z.boolean(),
});

// ==================== Query ====================

export const listCategoriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  // من query string تصل كنص - تحويل صريح (z.coerce.boolean يعتبر "false" صحيحاً!)
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  sortBy: z.enum(CATEGORY_SORTABLE_FIELDS).default("sortOrder"),
  sortOrder: z.enum(SORT_ORDERS).default("asc"),
});
