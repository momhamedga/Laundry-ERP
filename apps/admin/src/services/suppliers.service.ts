import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  CreateSupplierInput,
  ListSuppliersParams,
  Supplier,
  SupplierStats,
  SuppliersResult,
  UpdateSupplierInput,
} from "@/types/inventory";

function toParams<T extends object>(params: T): Record<string, string> {
  const q: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q[k] = String(v);
  }
  return q;
}

export async function listSuppliers(params: ListSuppliersParams): Promise<SuppliersResult> {
  const { data } = await apiClient.get<ApiListResponse<{ suppliers: Supplier[] }>>("/suppliers", {
    params: toParams(params),
  });
  return { suppliers: data.data.suppliers, meta: data.meta };
}

export async function getSupplierStats(id: string): Promise<SupplierStats> {
  const { data } = await apiClient.get<ApiResponse<{ stats: SupplierStats }>>(`/suppliers/${id}/stats`);
  return data.data.stats;
}

export async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  const { data } = await apiClient.post<ApiResponse<{ supplier: Supplier }>>("/suppliers", input);
  return data.data.supplier;
}

export async function updateSupplier(id: string, input: UpdateSupplierInput): Promise<Supplier> {
  const { data } = await apiClient.patch<ApiResponse<{ supplier: Supplier }>>(`/suppliers/${id}`, input);
  return data.data.supplier;
}

export async function disableSupplier(id: string): Promise<void> {
  await apiClient.delete(`/suppliers/${id}`);
}

export async function restoreSupplier(id: string): Promise<Supplier> {
  const { data } = await apiClient.patch<ApiResponse<{ supplier: Supplier }>>(`/suppliers/${id}/restore`);
  return data.data.supplier;
}
