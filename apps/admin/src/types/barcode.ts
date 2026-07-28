import type { PaginationMeta } from "@/types";
import type { InventoryItem } from "@/types/inventory";

/** أنواع الباركود (Phase 8) - مطابقة لـ apps/api/src/modules/barcode/* */

export type BarcodeType = "CODE128" | "CODE39" | "EAN13" | "EAN8" | "UPC" | "QR";
export type LabelSize = "A4" | "THERMAL_58" | "THERMAL_80" | "CUSTOM";
export type ScanAction = "VIEW" | "ADJUST" | "MOVEMENT" | "RECEIVE" | "SELL" | "TRANSFER" | "COUNT" | "LOOKUP";

export interface BarcodeStats {
  totalItems: number;
  withBarcode: number;
  missingBarcode: number;
  invalidBarcode: number;
  totalPrints: number;
  totalScans: number;
  invalidScans: number;
}

export interface GenerateInput {
  type: BarcodeType;
  mode: "auto" | "manual";
  value?: string;
  withQr?: boolean;
}

export interface BulkGenerateInput {
  itemIds: string[];
  type: BarcodeType;
  skipExisting?: boolean;
  withQr?: boolean;
}

export interface ScanResult {
  found: boolean;
  item: InventoryItem | null;
  lowStock: boolean;
}

// ==================== Templates ====================

export interface LabelTemplate {
  id: string;
  name: string;
  size: LabelSize;
  widthMm: number | null;
  heightMm: number | null;
  showName: boolean;
  showSku: boolean;
  showBarcode: boolean;
  showQr: boolean;
  showPrice: boolean;
  showCategory: boolean;
  showSupplier: boolean;
  showLogo: boolean;
  showCompanyName: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatesResult {
  templates: LabelTemplate[];
  meta: PaginationMeta;
}

export interface CreateTemplateInput {
  name: string;
  size: LabelSize;
  widthMm?: number | null;
  heightMm?: number | null;
  showName: boolean;
  showSku: boolean;
  showBarcode: boolean;
  showQr: boolean;
  showPrice: boolean;
  showCategory: boolean;
  showSupplier: boolean;
  showLogo: boolean;
  showCompanyName: boolean;
  isDefault: boolean;
}

export type UpdateTemplateInput = Partial<CreateTemplateInput> & { isActive?: boolean };

// ==================== Print ====================

export interface PrintInput {
  items: { itemId: string; quantity: number }[];
  size: LabelSize;
  templateId?: string;
}

export interface PrintLogRow {
  id: string;
  size: LabelSize;
  quantity: number;
  templateName: string | null;
  createdAt: string;
  item: { id: string; name: string; sku: string } | null;
}

export interface PrintHistoryResult {
  logs: PrintLogRow[];
  meta: PaginationMeta;
}

export interface ScanLogRow {
  id: string;
  code: string;
  action: ScanAction;
  success: boolean;
  createdAt: string;
  item: { id: string; name: string; sku: string } | null;
}

export interface ScanHistoryResult {
  scans: ScanLogRow[];
  meta: PaginationMeta;
}

export interface ListTemplatesParams {
  page?: number;
  limit?: number;
  search?: string;
}
export interface PrintHistoryParams {
  page?: number;
  limit?: number;
  itemId?: string;
}
