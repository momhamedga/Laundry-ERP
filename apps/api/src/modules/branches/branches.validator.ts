import { z } from "zod";
import {
  BRANCH_SORTABLE_FIELDS,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  SORT_ORDERS,
} from "./branches.constants.js";

const nameSchema = z.string().trim().min(2, "Name too short").max(100);
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, "Invalid phone number");

// ==================== Params ====================

export const branchIdParamSchema = z.object({
  /** معرف الفرع - قد لا يكون cuid (بيانات قديمة) */
  id: z.string().trim().min(1, "Invalid branch id"),
});

// ==================== Body ====================

export const createBranchSchema = z.object({
  name: nameSchema,
  address: z.string().trim().max(300).nullish(),
  phone: phoneSchema.nullish(),
});

export const updateBranchSchema = z
  .object({
    name: nameSchema,
    address: z.string().trim().max(300).nullable(),
    phone: phoneSchema.nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

export const branchStatusSchema = z.object({
  isActive: z.boolean(),
});

// ==================== Query ====================

export const listBranchesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  // من query string تصل كنص - تحويل صريح
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  sortBy: z.enum(BRANCH_SORTABLE_FIELDS).default("name"),
  sortOrder: z.enum(SORT_ORDERS).default("asc"),
});
