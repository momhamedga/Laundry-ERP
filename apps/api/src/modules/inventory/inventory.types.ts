import type {
  InventoryAlert,
  InventoryItem,
  InventoryTransaction,
} from "@prisma/client";

export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ListItemsResult {
  items: InventoryItem[];
  meta: PaginationMeta;
}

export type MovementWithItem = InventoryTransaction & {
  item: { id: string; name: string; sku: string; unit: string };
};

export interface ListMovementsResult {
  movements: MovementWithItem[];
  meta: PaginationMeta;
}

export type AlertWithItem = InventoryAlert & {
  item: { id: string; name: string; sku: string };
};

export interface ListAlertsResult {
  alerts: AlertWithItem[];
  meta: PaginationMeta;
}

/** لوحة مؤشرات المخزون - محسوبة من القاعدة مباشرة */
export interface InventoryStats {
  totalItems: number;
  activeItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
  openAlerts: number;
}

export interface StockCountResultLine {
  itemId: string;
  systemQuantity: number;
  countedQuantity: number;
  difference: number;
  adjusted: boolean;
}

export type { InventoryItem, InventoryTransaction, InventoryAlert };
