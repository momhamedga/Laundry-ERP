import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  CategoryMutationInput,
  CategoryWithCount,
  ListCategoriesParams,
  ListCategoriesResult,
  ServiceCategory,
} from "@/types/service-category";

function toQueryParams(params: ListCategoriesParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.limit) query.limit = String(params.limit);
  if (params.search) query.search = params.search;
  if (params.isActive !== undefined) query.isActive = String(params.isActive);
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  return query;
}

export async function listCategories(
  params: ListCategoriesParams,
): Promise<ListCategoriesResult> {
  const { data } = await apiClient.get<ApiListResponse<{ categories: CategoryWithCount[] }>>(
    "/service-categories",
    { params: toQueryParams(params) },
  );
  return { categories: data.data.categories, meta: data.meta };
}

export async function createCategory(input: CategoryMutationInput): Promise<ServiceCategory> {
  const { data } = await apiClient.post<ApiResponse<{ category: ServiceCategory }>>(
    "/service-categories",
    input,
  );
  return data.data.category;
}

export async function updateCategory(
  id: string,
  input: CategoryMutationInput,
): Promise<ServiceCategory> {
  const { data } = await apiClient.patch<ApiResponse<{ category: ServiceCategory }>>(
    `/service-categories/${id}`,
    input,
  );
  return data.data.category;
}

export async function changeCategoryStatus(
  id: string,
  isActive: boolean,
): Promise<ServiceCategory> {
  const { data } = await apiClient.patch<ApiResponse<{ category: ServiceCategory }>>(
    `/service-categories/${id}/status`,
    { isActive },
  );
  return data.data.category;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/service-categories/${id}`);
}
