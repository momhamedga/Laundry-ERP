import type { Supplier } from "@prisma/client";

export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ListSuppliersResult {
  suppliers: Supplier[];
  meta: PaginationMeta;
}

/** إحصائيات المورّد - تُحسب من قاعدة البيانات مباشرة */
export interface SupplierStats {
  totalPurchases: number;
  receivedPurchases: number;
  totalSpent: number;
  itemsSupplied: number;
  lastPurchaseAt: Date | null;
}

export type { Supplier };
