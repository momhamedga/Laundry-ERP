import { apiClient } from "@/lib/axios";
import { getCustomerProfileLocally, listCustomersLocally } from "@/lib/offline-customers";
import { route } from "@/lib/offline-router";
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

/** قائمة العملاء — تقرأ من الجدول المحلّي حين تتعذّر قاعدة البيانات */
export async function listCustomers(
  params: ListCustomersParams,
): Promise<ListCustomersResult> {
  return route({
    label: "customers.list",
    remote: async () => {
      const { data } = await apiClient.get<ApiListResponse<{ customers: Customer[] }>>(
        "/customers",
        { params: toQueryParams(params) },
      );
      return { customers: data.data.customers, meta: data.meta };
    },
    local: () => listCustomersLocally(params),
  });
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

/** ملفّ العميل — يقرأ محلّياً حين تتعذّر قاعدة البيانات */
export async function getCustomerProfile(id: string): Promise<CustomerProfile> {
  return route({
    label: "customers.profile",
    remote: async () => {
      const { data } = await apiClient.get<ApiResponse<CustomerProfile>>(
        `/customers/${id}/profile`,
      );
      return data.data;
    },
    local: () => getCustomerProfileLocally(id),
  });
}
