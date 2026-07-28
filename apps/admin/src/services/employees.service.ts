import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  ChangeEmployeeStatusInput,
  CreateEmployeeInput,
  EmployeeStats,
  EmployeeView,
  ListEmployeesParams,
  PaginationMeta,
  UpdateEmployeeInput,
} from "@/types/employee";

export async function listEmployees(
  params: ListEmployeesParams,
): Promise<{ employees: EmployeeView[]; meta: PaginationMeta }> {
  const { data } = await apiClient.get<ApiListResponse<{ employees: EmployeeView[] }>>(
    "/employees",
    { params },
  );
  return { employees: data.data.employees, meta: data.meta as PaginationMeta };
}

export async function getStats(): Promise<EmployeeStats> {
  const { data } = await apiClient.get<ApiResponse<{ stats: EmployeeStats }>>("/employees/stats");
  return data.data.stats;
}

export async function getEmployee(id: string): Promise<EmployeeView> {
  const { data } = await apiClient.get<ApiResponse<{ employee: EmployeeView }>>(`/employees/${id}`);
  return data.data.employee;
}

export async function createEmployee(input: CreateEmployeeInput): Promise<EmployeeView> {
  const { data } = await apiClient.post<ApiResponse<{ employee: EmployeeView }>>(
    "/employees",
    input,
  );
  return data.data.employee;
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput): Promise<EmployeeView> {
  const { data } = await apiClient.patch<ApiResponse<{ employee: EmployeeView }>>(
    `/employees/${id}`,
    input,
  );
  return data.data.employee;
}

export async function changeEmployeeStatus(
  id: string,
  input: ChangeEmployeeStatusInput,
): Promise<EmployeeView> {
  const { data } = await apiClient.patch<ApiResponse<{ employee: EmployeeView }>>(
    `/employees/${id}/status`,
    input,
  );
  return data.data.employee;
}
