import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  AdjustInput,
  AlertsResult,
  CreateItemInput,
  CreateMovementInput,
  InventoryItem,
  InventoryItemsResult,
  InventoryStats,
  ListItemsParams,
  ListMovementsParams,
  MovementsResult,
  StockCountInput,
  TransferInput,
  UpdateItemInput,
} from "@/types/inventory";

function toParams<T extends object>(params: T): Record<string, string> {
  const q: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q[k] = String(v);
  }
  return q;
}

export async function listItems(params: ListItemsParams): Promise<InventoryItemsResult> {
  const { data } = await apiClient.get<ApiListResponse<{ items: InventoryItem[] }>>(
    "/inventory/items",
    { params: toParams(params) },
  );
  return { items: data.data.items, meta: data.meta };
}

export async function getItem(id: string): Promise<InventoryItem> {
  const { data } = await apiClient.get<ApiResponse<{ item: InventoryItem }>>(`/inventory/items/${id}`);
  return data.data.item;
}

export async function getInventoryStats(): Promise<InventoryStats> {
  const { data } = await apiClient.get<ApiResponse<{ stats: InventoryStats }>>("/inventory/stats");
  return data.data.stats;
}

export async function createItem(input: CreateItemInput): Promise<InventoryItem> {
  const { data } = await apiClient.post<ApiResponse<{ item: InventoryItem }>>("/inventory/items", input);
  return data.data.item;
}

export async function updateItem(id: string, input: UpdateItemInput): Promise<InventoryItem> {
  const { data } = await apiClient.patch<ApiResponse<{ item: InventoryItem }>>(
    `/inventory/items/${id}`,
    input,
  );
  return data.data.item;
}

export async function deleteItem(id: string): Promise<void> {
  await apiClient.delete(`/inventory/items/${id}`);
}

export async function restoreItem(id: string): Promise<InventoryItem> {
  const { data } = await apiClient.patch<ApiResponse<{ item: InventoryItem }>>(
    `/inventory/items/${id}/restore`,
  );
  return data.data.item;
}

export async function createMovement(id: string, input: CreateMovementInput): Promise<InventoryItem> {
  const { data } = await apiClient.post<ApiResponse<{ item: InventoryItem }>>(
    `/inventory/items/${id}/movement`,
    input,
  );
  return data.data.item;
}

export async function adjustItem(id: string, input: AdjustInput): Promise<InventoryItem> {
  const { data } = await apiClient.post<ApiResponse<{ item: InventoryItem }>>(
    `/inventory/items/${id}/adjust`,
    input,
  );
  return data.data.item;
}

export async function transferStock(input: TransferInput): Promise<void> {
  await apiClient.post("/inventory/transfer", input);
}

export async function stockCount(input: StockCountInput): Promise<void> {
  await apiClient.post("/inventory/count", input);
}

export async function listMovements(params: ListMovementsParams): Promise<MovementsResult> {
  const { data } = await apiClient.get<ApiListResponse<{ movements: MovementsResult["movements"] }>>(
    "/inventory/movements",
    { params: toParams(params) },
  );
  return { movements: data.data.movements, meta: data.meta };
}

export async function listAlerts(params: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
}): Promise<AlertsResult> {
  const { data } = await apiClient.get<ApiListResponse<{ alerts: AlertsResult["alerts"] }>>(
    "/inventory/alerts",
    { params: toParams(params) },
  );
  return { alerts: data.data.alerts, meta: data.meta };
}

export async function resolveAlert(id: string): Promise<void> {
  await apiClient.patch(`/inventory/alerts/${id}/resolve`);
}
