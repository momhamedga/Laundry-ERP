import { z } from "zod";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_PURCHASE_ITEMS,
  MAX_SEARCH_LENGTH,
  PURCHASE_SORTABLE_FIELDS,
  SORT_ORDERS,
} from "./purchases.constants.js";

export const purchaseIdParamSchema = z.object({ id: z.cuid("Invalid purchase id") });

const lineSchema = z.object({
  itemId: z.cuid("Invalid item id"),
  quantity: z.coerce.number().positive().max(1_000_000_000),
  unitCost: z.coerce.number().nonnegative().max(1_000_000_000),
});

export const createPurchaseSchema = z.object({
  supplierId: z.cuid("Invalid supplier id"),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().trim().max(1000).nullish(),
  items: z.array(lineSchema).min(1, "At least one item required").max(MAX_PURCHASE_ITEMS),
});

export const updatePurchaseSchema = z
  .object({
    supplierId: z.cuid("Invalid supplier id"),
    taxRate: z.coerce.number().min(0).max(100),
    notes: z.string().trim().max(1000).nullable(),
    items: z.array(lineSchema).min(1).max(MAX_PURCHASE_ITEMS),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

export const listPurchasesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  status: z.enum(["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"]).optional(),
  supplierId: z.cuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortBy: z.enum(PURCHASE_SORTABLE_FIELDS).default("createdAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});
