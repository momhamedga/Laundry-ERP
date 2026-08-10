import { BarcodeType, LabelSize, ScanAction } from "@prisma/client";
import { z } from "zod";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_BULK_ITEMS,
  MAX_LABEL_QUANTITY,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  PRINT_HISTORY_SORTABLE_FIELDS,
  SORT_ORDERS,
} from "./barcode.constants.js";

export const itemIdParamSchema = z.object({ id: z.cuid("Invalid item id") });
export const templateIdParamSchema = z.object({ id: z.cuid("Invalid template id") });

// ==================== Generate ====================

export const generateSchema = z.object({
  type: z.enum(BarcodeType),
  /** يدوي: القيمة يوفّرها المستخدم (تُتحقّق حسب النوع). auto: تُولَّد */
  mode: z.enum(["auto", "manual"]).default("auto"),
  value: z.string().trim().max(1000).optional(),
  /** توليد QR أيضاً بالحمولة الافتراضية (SKU) */
  withQr: z.boolean().default(true),
});

export const bulkGenerateSchema = z.object({
  itemIds: z.array(z.cuid()).min(1).max(MAX_BULK_ITEMS),
  type: z.enum(BarcodeType),
  /** تخطّي الأصناف التي لها باركود بالفعل (لا Regenerate) */
  skipExisting: z.boolean().default(true),
  withQr: z.boolean().default(true),
});

export const updateBarcodeSchema = z
  .object({
    type: z.enum(BarcodeType),
    value: z.string().trim().min(1).max(1000),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "لا توجد حقول للتعديل." });

// ==================== Print ====================

export const printSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.cuid(),
        quantity: z.coerce.number().int().min(1).max(MAX_LABEL_QUANTITY).default(1),
      }),
    )
    .min(1)
    .max(MAX_BULK_ITEMS),
  size: z.enum(LabelSize).default("A4"),
  templateId: z.cuid().optional(),
});

export const printHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  itemId: z.cuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortBy: z.enum(PRINT_HISTORY_SORTABLE_FIELDS).default("createdAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});

// ==================== Scan ====================

export const scanSchema = z.object({
  code: z.string().trim().min(1, "Code required").max(1000),
  action: z.enum(ScanAction).default("LOOKUP"),
});

export const lookupQuerySchema = z.object({
  code: z.string().trim().min(1).max(1000),
});

export const scanHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  success: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  action: z.enum(ScanAction).optional(),
});

// ==================== Templates ====================

const templateFields = {
  name: z.string().trim().min(2).max(100),
  size: z.enum(LabelSize),
  widthMm: z.coerce.number().int().min(10).max(1000).nullish(),
  heightMm: z.coerce.number().int().min(10).max(1000).nullish(),
  showName: z.boolean(),
  showSku: z.boolean(),
  showBarcode: z.boolean(),
  showQr: z.boolean(),
  showPrice: z.boolean(),
  showCategory: z.boolean(),
  showSupplier: z.boolean(),
  showLogo: z.boolean(),
  showCompanyName: z.boolean(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
};

export const createTemplateSchema = z.object({
  name: templateFields.name,
  size: templateFields.size.default("A4"),
  widthMm: templateFields.widthMm,
  heightMm: templateFields.heightMm,
  showName: templateFields.showName.default(true),
  showSku: templateFields.showSku.default(true),
  showBarcode: templateFields.showBarcode.default(true),
  showQr: templateFields.showQr.default(false),
  showPrice: templateFields.showPrice.default(true),
  showCategory: templateFields.showCategory.default(false),
  showSupplier: templateFields.showSupplier.default(false),
  showLogo: templateFields.showLogo.default(false),
  showCompanyName: templateFields.showCompanyName.default(true),
  isDefault: templateFields.isDefault.default(false),
});

export const updateTemplateSchema = z
  .object(templateFields)
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "لا توجد حقول للتعديل." });

export const listTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
});
