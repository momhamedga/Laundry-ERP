import { InventoryItemType, InventoryUnit } from "@prisma/client";
import { z } from "zod";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  GENERIC_MOVEMENT_TYPES,
  ITEM_SORTABLE_FIELDS,
  MAX_COUNT_LINES,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  MOVEMENT_SORTABLE_FIELDS,
  SORT_ORDERS,
} from "./inventory.constants.js";

const qty = z.coerce.number().nonnegative().max(1_000_000_000);
const positiveQty = z.coerce.number().positive().max(1_000_000_000);
const money = z.coerce.number().nonnegative().max(1_000_000_000);

export const itemIdParamSchema = z.object({ id: z.cuid("Invalid item id") });
export const alertIdParamSchema = z.object({ id: z.cuid("Invalid alert id") });

// ==================== Items ====================

export const createItemSchema = z.object({
  sku: z.string().trim().min(1, "SKU required").max(60),
  name: z.string().trim().min(2, "Name too short").max(150),
  type: z.enum(InventoryItemType).default("PRODUCT"),
  unit: z.enum(InventoryUnit).default("PIECE"),
  category: z.string().trim().max(100).nullish(),
  description: z.string().trim().max(1000).nullish(),
  quantity: qty.default(0), // رصيد افتتاحي - يُسجَّل كحركة OPENING
  reorderLevel: qty.default(0),
  costPrice: money.default(0),
  sellPrice: money.default(0),
  supplierId: z.cuid("Invalid supplier id").nullish(),
});

export const updateItemSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    type: z.enum(InventoryItemType),
    unit: z.enum(InventoryUnit),
    category: z.string().trim().max(100).nullable(),
    description: z.string().trim().max(1000).nullable(),
    reorderLevel: qty,
    costPrice: money,
    sellPrice: money,
    supplierId: z.cuid("Invalid supplier id").nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "لا توجد حقول للتعديل." });

export const listItemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  type: z.enum(InventoryItemType).optional(),
  supplierId: z.cuid().optional(),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  lowStock: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  sortBy: z.enum(ITEM_SORTABLE_FIELDS).default("createdAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});

// ==================== Movements ====================

export const createMovementSchema = z.object({
  type: z.enum(GENERIC_MOVEMENT_TYPES),
  quantity: positiveQty,
  unitCost: money.optional(),
  reference: z.string().trim().max(120).nullish(),
  note: z.string().trim().max(500).nullish(),
});

export const adjustSchema = z.object({
  /** الرصيد الجديد المطلق بعد الجرد/التصحيح */
  newQuantity: qty,
  reason: z.string().trim().min(2, "Reason required").max(300),
});

export const transferSchema = z
  .object({
    fromItemId: z.cuid("Invalid source item id"),
    toItemId: z.cuid("Invalid destination item id"),
    quantity: positiveQty,
    note: z.string().trim().max(500).nullish(),
  })
  .refine((d) => d.fromItemId !== d.toItemId, {
    message: "المصدر والوجهة يجب أن يختلفا.",
    path: ["toItemId"],
  });

export const stockCountSchema = z.object({
  note: z.string().trim().max(500).nullish(),
  lines: z
    .array(
      z.object({
        itemId: z.cuid("Invalid item id"),
        countedQuantity: qty,
      }),
    )
    .min(1, "At least one line required")
    .max(MAX_COUNT_LINES),
});

export const listMovementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  itemId: z.cuid().optional(),
  type: z.enum(["IN", "OUT", "RETURN", "ADJUSTMENT", "LOSS", "TRANSFER", "OPENING", "CLOSING"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortBy: z.enum(MOVEMENT_SORTABLE_FIELDS).default("createdAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});

export const listAlertsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  status: z.enum(["OPEN", "RESOLVED"]).optional(),
  type: z.enum(["LOW_STOCK", "OUT_OF_STOCK"]).optional(),
});
