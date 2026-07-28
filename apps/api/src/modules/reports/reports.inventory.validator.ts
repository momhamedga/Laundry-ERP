import { z } from "zod";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  INVENTORY_REPORT_SORTABLE_FIELDS,
  MAX_PAGE_SIZE,
  MOVEMENTS_REPORT_SORTABLE_FIELDS,
  PURCHASES_REPORT_SORTABLE_FIELDS,
  SORT_ORDERS,
  STOCK_VALUE_REPORT_SORTABLE_FIELDS,
  SUPPLIERS_REPORT_SORTABLE_FIELDS,
} from "./reports.constants.js";

const pageFields = {
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
};

export const inventoryReportQuerySchema = z.object({
  ...pageFields,
  type: z.enum(["PRODUCT", "RAW_MATERIAL"]).optional(),
  supplierId: z.cuid().optional(),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  sortBy: z.enum(INVENTORY_REPORT_SORTABLE_FIELDS).default("name"),
});

export const movementsReportQuerySchema = z.object({
  ...pageFields,
  itemId: z.cuid().optional(),
  type: z
    .enum(["IN", "OUT", "RETURN", "ADJUSTMENT", "LOSS", "TRANSFER", "OPENING", "CLOSING"])
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortBy: z.enum(MOVEMENTS_REPORT_SORTABLE_FIELDS).default("createdAt"),
});

export const suppliersReportQuerySchema = z.object({
  ...pageFields,
  isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  sortBy: z.enum(SUPPLIERS_REPORT_SORTABLE_FIELDS).default("name"),
});

export const purchasesReportQuerySchema = z.object({
  ...pageFields,
  status: z.enum(["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"]).optional(),
  supplierId: z.cuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortBy: z.enum(PURCHASES_REPORT_SORTABLE_FIELDS).default("createdAt"),
});

export const stockValueReportQuerySchema = z.object({
  ...pageFields,
  type: z.enum(["PRODUCT", "RAW_MATERIAL"]).optional(),
  sortBy: z.enum(STOCK_VALUE_REPORT_SORTABLE_FIELDS).default("quantity"),
});
