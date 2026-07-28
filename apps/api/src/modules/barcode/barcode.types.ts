import type { InventoryItem, LabelPrintLog, LabelTemplate } from "@prisma/client";

export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type PrintLogWithItem = LabelPrintLog & {
  item: { id: string; name: string; sku: string } | null;
};

export interface ListPrintHistoryResult {
  logs: PrintLogWithItem[];
  meta: PaginationMeta;
}

export type ScanLogWithItem = {
  id: string;
  code: string;
  action: string;
  success: boolean;
  createdAt: Date;
  item: { id: string; name: string; sku: string } | null;
};

export interface ListScanHistoryResult {
  scans: ScanLogWithItem[];
  meta: PaginationMeta;
}

export interface ListTemplatesResult {
  templates: LabelTemplate[];
  meta: PaginationMeta;
}

/** نتيجة المسح - الصنف المُطابِق أو فشل (Invalid Scan) */
export interface ScanResult {
  found: boolean;
  item: InventoryItem | null;
  /** true إذا كان الصنف منخفض المخزون لحظة المسح */
  lowStock: boolean;
}

/** مؤشرات الباركود */
export interface BarcodeStats {
  totalItems: number;
  withBarcode: number;
  missingBarcode: number;
  invalidBarcode: number;
  totalPrints: number;
  totalScans: number;
  invalidScans: number;
}

export type { InventoryItem, LabelTemplate, LabelPrintLog };
