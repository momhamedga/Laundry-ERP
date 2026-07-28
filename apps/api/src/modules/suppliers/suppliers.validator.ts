import { z } from "zod";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  SORT_ORDERS,
  SUPPLIER_SORTABLE_FIELDS,
} from "./suppliers.constants.js";

const nameSchema = z.string().trim().min(2, "Name too short").max(150);
const phoneSchema = z.string().trim().regex(/^\+?[0-9]{7,15}$/, "Invalid phone number");

export const supplierIdParamSchema = z.object({ id: z.cuid("Invalid supplier id") });

export const createSupplierSchema = z.object({
  name: nameSchema,
  contactName: z.string().trim().max(100).nullish(),
  phone: phoneSchema.nullish(),
  email: z.email("Invalid email").toLowerCase().trim().nullish(),
  address: z.string().trim().max(300).nullish(),
  taxNumber: z.string().trim().max(50).nullish(),
  notes: z.string().trim().max(1000).nullish(),
});

export const updateSupplierSchema = z
  .object({
    name: nameSchema,
    contactName: z.string().trim().max(100).nullable(),
    phone: phoneSchema.nullable(),
    email: z.email("Invalid email").toLowerCase().trim().nullable(),
    address: z.string().trim().max(300).nullable(),
    taxNumber: z.string().trim().max(50).nullable(),
    notes: z.string().trim().max(1000).nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

export const listSuppliersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  sortBy: z.enum(SUPPLIER_SORTABLE_FIELDS).default("createdAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});
