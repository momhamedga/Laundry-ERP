import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type { Branch } from "@/types/orders";
import type {
  Branch as BranchFull,
  CreateBranchInput,
  ListBranchesParams,
  ListBranchesResult,
  UpdateBranchInput,
} from "@/types/branch";

/**
 * قراءة فقط - Endpoint /branches موجود بالخادم مسبقاً (Phase 8a) ولم
 * يُستهلك من الواجهة قبل الآن. يُستخدم هنا حصراً لتعبئة فلتر الفرع.
 */
export async function listActiveBranches(): Promise<Branch[]> {
  const { data } = await apiClient.get<ApiListResponse<{ branches: Branch[] }>>("/branches", {
    params: { limit: 100, isActive: "true", sortBy: "name", sortOrder: "asc" },
  });
  return data.data.branches;
}

// ==================== Branches Management (Full CRUD) ====================

function toQueryParams(params: ListBranchesParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.limit) query.limit = String(params.limit);
  if (params.search) query.search = params.search;
  if (params.isActive !== undefined) query.isActive = String(params.isActive);
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  return query;
}

export async function listBranches(params: ListBranchesParams): Promise<ListBranchesResult> {
  const { data } = await apiClient.get<ApiListResponse<{ branches: BranchFull[] }>>("/branches", {
    params: toQueryParams(params),
  });
  return { branches: data.data.branches, meta: data.meta };
}

export async function getBranch(id: string): Promise<BranchFull> {
  const { data } = await apiClient.get<ApiResponse<{ branch: BranchFull }>>(`/branches/${id}`);
  return data.data.branch;
}

export async function createBranch(input: CreateBranchInput): Promise<BranchFull> {
  const { data } = await apiClient.post<ApiResponse<{ branch: BranchFull }>>("/branches", input);
  return data.data.branch;
}

export async function updateBranch(id: string, input: UpdateBranchInput): Promise<BranchFull> {
  const { data } = await apiClient.patch<ApiResponse<{ branch: BranchFull }>>(
    `/branches/${id}`,
    input,
  );
  return data.data.branch;
}

export async function changeBranchStatus(id: string, isActive: boolean): Promise<BranchFull> {
  const { data } = await apiClient.patch<ApiResponse<{ branch: BranchFull }>>(
    `/branches/${id}/status`,
    { isActive },
  );
  return data.data.branch;
}

/** الحذف مرفوض بالخادم إن كان بالفرع موظفون أو طلبات (409) - التعطيل البديل */
export async function deleteBranch(id: string): Promise<void> {
  await apiClient.delete(`/branches/${id}`);
}
