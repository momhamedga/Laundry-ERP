import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  CreatePurchaseInput,
  ListPurchasesParams,
  PurchaseDetail,
  PurchaseListRow,
  PurchasesResult,
} from "@/types/inventory";

function toParams<T extends object>(params: T): Record<string, string> {
  const q: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q[k] = String(v);
  }
  return q;
}

export async function listPurchases(params: ListPurchasesParams): Promise<PurchasesResult> {
  const { data } = await apiClient.get<ApiListResponse<{ purchases: PurchaseListRow[] }>>(
    "/purchases",
    { params: toParams(params) },
  );
  return { purchases: data.data.purchases, meta: data.meta };
}

export async function getPurchase(id: string): Promise<PurchaseDetail> {
  const { data } = await apiClient.get<ApiResponse<{ purchase: PurchaseDetail }>>(`/purchases/${id}`);
  return data.data.purchase;
}

export async function createPurchase(input: CreatePurchaseInput): Promise<PurchaseDetail> {
  const { data } = await apiClient.post<ApiResponse<{ purchase: PurchaseDetail }>>("/purchases", input);
  return data.data.purchase;
}

export async function deletePurchase(id: string): Promise<void> {
  await apiClient.delete(`/purchases/${id}`);
}

export async function receivePurchase(id: string): Promise<PurchaseDetail> {
  const { data } = await apiClient.post<ApiResponse<{ purchase: PurchaseDetail }>>(
    `/purchases/${id}/receive`,
  );
  return data.data.purchase;
}

export async function cancelPurchase(id: string): Promise<void> {
  await apiClient.post(`/purchases/${id}/cancel`);
}
