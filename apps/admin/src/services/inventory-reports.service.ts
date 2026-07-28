import { apiClient } from "@/lib/axios";
import type { ApiListResponse } from "@/types";

export interface InventoryReportRow {
  id: string;
  sku: string;
  name: string;
  type: string;
  unit: string;
  supplierName: string | null;
  quantity: number;
  reorderLevel: number;
  costPrice: number;
  stockValue: number;
  isActive: boolean;
}

export interface StockValueRow {
  id: string;
  sku: string;
  name: string;
  type: string;
  quantity: number;
  costPrice: number;
  stockValue: number;
}

export async function fetchInventoryReport(): Promise<{
  items: InventoryReportRow[];
  summary: { totalItems: number; totalQuantity: number };
}> {
  const { data } = await apiClient.get<
    ApiListResponse<{ items: InventoryReportRow[]; summary: { totalItems: number; totalQuantity: number } }>
  >("/reports/inventory", { params: { limit: 100 } });
  return { items: data.data.items, summary: data.data.summary };
}

export async function fetchStockValueReport(): Promise<{
  items: StockValueRow[];
  summary: { totalValue: number; totalQuantity: number };
}> {
  const { data } = await apiClient.get<
    ApiListResponse<{ items: StockValueRow[]; summary: { totalValue: number; totalQuantity: number } }>
  >("/reports/inventory-stock-value", { params: { limit: 100 } });
  return { items: data.data.items, summary: data.data.summary };
}
