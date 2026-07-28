import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse, UserRole } from "@/types";
import type {
  ActivityParams,
  ActivityResult,
  CreateUserInput,
  ListUsersParams,
  ListUsersResult,
  UpdateUserInput,
  User,
  UserDetails,
} from "@/types/user";

function toQueryParams(params: ListUsersParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.limit) query.limit = String(params.limit);
  if (params.search) query.search = params.search;
  if (params.role) query.role = params.role;
  if (params.isActive !== undefined) query.isActive = String(params.isActive);
  if (params.branchId) query.branchId = params.branchId;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  return query;
}

export async function listUsers(params: ListUsersParams): Promise<ListUsersResult> {
  const { data } = await apiClient.get<ApiListResponse<{ users: User[] }>>("/users", {
    params: toQueryParams(params),
  });
  return { users: data.data.users, meta: data.meta };
}

export async function getUser(id: string): Promise<UserDetails> {
  const { data } = await apiClient.get<ApiResponse<UserDetails>>(`/users/${id}`);
  return data.data;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data } = await apiClient.post<ApiResponse<{ user: User }>>("/users", input);
  return data.data.user;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const { data } = await apiClient.patch<ApiResponse<{ user: User }>>(`/users/${id}`, input);
  return data.data.user;
}

/** لا حذف نهائي في هذه المرحلة - فقط تفعيل/تعطيل عبر PATCH /users/:id/status */
export async function changeUserStatus(id: string, isActive: boolean): Promise<User> {
  const { data } = await apiClient.patch<ApiResponse<{ user: User }>>(`/users/${id}/status`, {
    isActive,
  });
  return data.data.user;
}

export async function assignUserRole(id: string, role: UserRole): Promise<User> {
  const { data } = await apiClient.patch<ApiResponse<{ user: User }>>(`/users/${id}/role`, {
    role,
  });
  return data.data.user;
}

export async function adminResetPassword(id: string, newPassword: string): Promise<void> {
  await apiClient.post(`/users/${id}/reset-password`, { newPassword });
}

export async function getUserActivity(
  id: string,
  params: ActivityParams,
): Promise<ActivityResult> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.limit) query.limit = String(params.limit);
  const { data } = await apiClient.get<ApiListResponse<{ activity: ActivityResult["activity"] }>>(
    `/users/${id}/activity`,
    { params: query },
  );
  return { activity: data.data.activity, meta: data.meta };
}
