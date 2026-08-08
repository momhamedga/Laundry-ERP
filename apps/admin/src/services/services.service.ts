import { apiClient } from "@/lib/axios";
import { listServicesLocally } from "@/lib/offline-catalog";
import { route } from "@/lib/offline-router";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  CreateServiceInput,
  ListServicesParams,
  ListServicesResult,
  Service,
  ServiceMutationInput,
} from "@/types/service";

function toQueryParams(params: ListServicesParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.limit) query.limit = String(params.limit);
  if (params.search) query.search = params.search;
  if (params.categoryId) query.categoryId = params.categoryId;
  if (params.unit) query.unit = params.unit;
  if (params.isActive !== undefined) query.isActive = String(params.isActive);
  if (params.minPrice !== undefined) query.minPrice = String(params.minPrice);
  if (params.maxPrice !== undefined) query.maxPrice = String(params.maxPrice);
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  return query;
}

/** قائمة الخدمات — تقرأ من الكاش المحلّي حين تتعذّر قاعدة البيانات */
export async function listServices(params: ListServicesParams): Promise<ListServicesResult> {
  return route({
    label: "services.list",
    remote: async () => {
      const { data } = await apiClient.get<ApiListResponse<{ services: Service[] }>>("/services", {
        params: toQueryParams(params),
      });
      return { services: data.data.services, meta: data.meta };
    },
    local: () => listServicesLocally(params),
  });
}

export async function createService(input: CreateServiceInput): Promise<Service> {
  const { data } = await apiClient.post<ApiResponse<{ service: Service }>>("/services", input);
  return data.data.service;
}

export async function updateService(
  id: string,
  input: ServiceMutationInput,
): Promise<Service> {
  const { data } = await apiClient.patch<ApiResponse<{ service: Service }>>(
    `/services/${id}`,
    input,
  );
  return data.data.service;
}

export async function deleteService(id: string): Promise<void> {
  await apiClient.delete(`/services/${id}`);
}

export async function restoreService(id: string): Promise<Service> {
  const { data } = await apiClient.patch<ApiResponse<{ service: Service }>>(
    `/services/${id}/restore`,
  );
  return data.data.service;
}
