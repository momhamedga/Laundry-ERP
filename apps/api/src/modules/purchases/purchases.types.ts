import type { Purchase, PurchaseItem } from "@prisma/client";

export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type PurchaseListRow = Purchase & {
  supplier: { id: string; name: string };
  _count: { items: number };
};

export type PurchaseDetail = Purchase & {
  supplier: { id: string; name: string };
  items: (PurchaseItem & { item: { id: string; name: string; sku: string; unit: string } })[];
};

export interface ListPurchasesResult {
  purchases: PurchaseListRow[];
  meta: PaginationMeta;
}

export type { Purchase, PurchaseItem };
