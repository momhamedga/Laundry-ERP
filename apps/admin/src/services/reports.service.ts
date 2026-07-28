import { apiClient } from "@/lib/axios";
import type { ApiListResponse } from "@/types";
import type {
  BranchesReportParams,
  BranchesReportResult,
  CustomersReportParams,
  CustomersReportResult,
  EmployeesReportParams,
  EmployeesReportResult,
  OrdersReportParams,
  OrdersReportResult,
  PaymentsReportParams,
  PaymentsReportResult,
  ServicesReportParams,
  ServicesReportResult,
} from "@/types/report";

/** يحوّل أي كائن فلاتر لمعاملات نصية - يُسقِط undefined/فارغ فقط، بلا تحويل قيم */
function toQueryParams<T extends object>(params: T): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query[key] = String(value);
  }
  return query;
}

export async function getOrdersReport(params: OrdersReportParams): Promise<OrdersReportResult> {
  const { data } = await apiClient.get<
    ApiListResponse<Pick<OrdersReportResult, "summary" | "orders">>
  >("/reports/orders", { params: toQueryParams(params) });
  return { summary: data.data.summary, orders: data.data.orders, meta: data.meta };
}

export async function getPaymentsReport(params: PaymentsReportParams): Promise<PaymentsReportResult> {
  const { data } = await apiClient.get<
    ApiListResponse<Pick<PaymentsReportResult, "summary" | "payments">>
  >("/reports/payments", { params: toQueryParams(params) });
  return { summary: data.data.summary, payments: data.data.payments, meta: data.meta };
}

export async function getCustomersReport(
  params: CustomersReportParams,
): Promise<CustomersReportResult> {
  const { data } = await apiClient.get<
    ApiListResponse<Pick<CustomersReportResult, "summary" | "topCustomers" | "customers">>
  >("/reports/customers", { params: toQueryParams(params) });
  return {
    summary: data.data.summary,
    topCustomers: data.data.topCustomers,
    customers: data.data.customers,
    meta: data.meta,
  };
}

export async function getServicesReport(params: ServicesReportParams): Promise<ServicesReportResult> {
  const { data } = await apiClient.get<ApiListResponse<Pick<ServicesReportResult, "services">>>(
    "/reports/services",
    { params: toQueryParams(params) },
  );
  return { services: data.data.services, meta: data.meta };
}

export async function getBranchesReport(params: BranchesReportParams): Promise<BranchesReportResult> {
  const { data } = await apiClient.get<ApiListResponse<Pick<BranchesReportResult, "branches">>>(
    "/reports/branches",
    { params: toQueryParams(params) },
  );
  return { branches: data.data.branches, meta: data.meta };
}

export async function getEmployeesReport(
  params: EmployeesReportParams,
): Promise<EmployeesReportResult> {
  const { data } = await apiClient.get<ApiListResponse<Pick<EmployeesReportResult, "employees">>>(
    "/reports/employees",
    { params: toQueryParams(params) },
  );
  return { employees: data.data.employees, meta: data.meta };
}
