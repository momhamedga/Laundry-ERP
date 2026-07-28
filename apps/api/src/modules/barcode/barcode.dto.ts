import type { z } from "zod";
import type {
  bulkGenerateSchema,
  createTemplateSchema,
  generateSchema,
  listTemplatesQuerySchema,
  printHistoryQuerySchema,
  printSchema,
  scanHistoryQuerySchema,
  scanSchema,
  updateBarcodeSchema,
  updateTemplateSchema,
} from "./barcode.validator.js";

export type GenerateDto = z.infer<typeof generateSchema>;
export type BulkGenerateDto = z.infer<typeof bulkGenerateSchema>;
export type UpdateBarcodeDto = z.infer<typeof updateBarcodeSchema>;
export type PrintDto = z.infer<typeof printSchema>;
export type PrintHistoryQuery = z.infer<typeof printHistoryQuerySchema>;
export type ScanDto = z.infer<typeof scanSchema>;
export type ScanHistoryQuery = z.infer<typeof scanHistoryQuerySchema>;
export type CreateTemplateDto = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateDto = z.infer<typeof updateTemplateSchema>;
export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;
