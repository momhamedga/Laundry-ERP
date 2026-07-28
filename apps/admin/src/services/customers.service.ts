import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  Customer,
  CustomerMutationInput,
  CustomerProfile,
  ListCustomersParams,
  ListCustomersResult,
} from "@/types/customer";

/** تحويل الفلاتر إلى query params - يستبعد القيم الفارغة/غير المعرّفة */
function toQueryParams(params: ListCustomersParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.limit) query.limit = String(params.limit);
  if (params.search) query.search = params.search;
  if (params.isActive !== undefined) query.isActive = String(params.isActive);
  if (params.createdFrom) query.createdFrom = params.createdFrom;
  if (params.createdTo) query.createdTo = params.createdTo;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  return query;
}

export async function listCustomers(
  params: ListCustomersParams,
): Promise<ListCustomersResult> {
  const { data } = await apiClient.get<ApiListResponse<{ customers: Customer[] }>>(
    "/customers",
    { params: toQueryParams(params) },
  );
  return { customers: data.data.customers, meta: data.meta };
}

export async function createCustomer(input: CustomerMutationInput): Promise<Customer> {
  const { data } = await apiClient.post<ApiResponse<{ customer: Customer }>>(
    "/customers",
    input,
  );
  return data.data.customer;
}

export async function updateCustomer(
  id: string,
  input: CustomerMutationInput,
): Promise<Customer> {
  const { data } = await apiClient.patch<ApiResponse<{ customer: Customer }>>(
    `/customers/${id}`,
    input,
  );
  return data.data.customer;
}

export async function updateCustomerNotes(
  id: string,
  notes: string | null,
): Promise<Customer> {
  const { data } = await apiClient.patch<ApiResponse<{ customer: Customer }>>(
    `/customers/${id}/notes`,
    { notes },
  );
  return data.data.customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiClient.delete(`/customers/${id}`);
}

export async function restoreCustomer(id: string): Promise<Customer> {
  const { data } = await apiClient.patch<ApiResponse<{ customer: Customer }>>(
    `/customers/${id}/restore`,
  );
  return data.data.customer;
}

export async function getCustomerProfile(id: string): Promise<CustomerProfile> {
  const { data } = await apiClient.get<ApiResponse<CustomerProfile>>(
    `/customers/${id}/profile`,
  );
  return data.data;
}
