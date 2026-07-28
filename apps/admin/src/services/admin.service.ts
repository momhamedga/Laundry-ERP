import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse, UserRole } from "@/types";
import type {
  ForceLogoutInput,
  ForceLogoutResult,
  ListLoginHistoryParams,
  LoginHistoryEntry,
  PaginationMeta,
  PermissionMatrix,
  SecurityCenter,
  SessionView,
} from "@/types/admin";

export async function getSecurityCenter(): Promise<SecurityCenter> {
  const { data } =
    await apiClient.get<ApiResponse<{ securityCenter: SecurityCenter }>>("/admin/security-center");
  return data.data.securityCenter;
}

export async function getPermissionMatrix(): Promise<PermissionMatrix> {
  const { data } =
    await apiClient.get<ApiResponse<{ matrix: PermissionMatrix }>>("/admin/permissions-matrix");
  return data.data.matrix;
}

export async function listLoginHistory(
  params: ListLoginHistoryParams,
): Promise<{ entries: LoginHistoryEntry[]; meta: PaginationMeta }> {
  const { data } = await apiClient.get<ApiListResponse<{ entries: LoginHistoryEntry[] }>>(
    "/admin/login-history",
    { params },
  );
  return { entries: data.data.entries, meta: data.meta as PaginationMeta };
}

export async function getUserSessions(userId: string): Promise<SessionView[]> {
  const { data } = await apiClient.get<ApiResponse<{ sessions: SessionView[] }>>(
    `/admin/users/${userId}/sessions`,
  );
  return data.data.sessions;
}

export async function killSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/admin/sessions/${sessionId}`);
}

export async function forceLogout(input: ForceLogoutInput): Promise<ForceLogoutResult> {
  const { data } = await apiClient.post<ApiResponse<{ result: ForceLogoutResult }>>(
    "/admin/force-logout",
    input,
  );
  return data.data.result;
}

// ==================== Phase 9.6c ====================

export interface UserPermissions {
  userId: string;
  role: UserRole;
  rolePermissions: string[];
  overrides: { permission: string; granted: boolean }[];
  effective: string[];
}

export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const { data } = await apiClient.get<ApiResponse<{ permissions: UserPermissions }>>(
    `/admin/users/${userId}/permissions`,
  );
  return data.data.permissions;
}

export async function setUserOverride(
  userId: string,
  permission: string,
  granted: boolean,
): Promise<UserPermissions> {
  const { data } = await apiClient.put<ApiResponse<{ permissions: UserPermissions }>>(
    `/admin/users/${userId}/permissions`,
    { permission, granted },
  );
  return data.data.permissions;
}

export async function removeUserOverride(userId: string, permission: string): Promise<UserPermissions> {
  const { data } = await apiClient.delete<ApiResponse<{ permissions: UserPermissions }>>(
    `/admin/users/${userId}/permissions`,
    { data: { permission } },
  );
  return data.data.permissions;
}

export interface ImpersonationResult {
  accessToken: string;
  user: { id: string; name: string; email: string; role: UserRole };
}

export async function impersonateUser(userId: string): Promise<ImpersonationResult> {
  const { data } = await apiClient.post<ApiResponse<ImpersonationResult>>(
    `/admin/impersonate/${userId}`,
  );
  return data.data;
}

export async function stopImpersonationRequest(): Promise<void> {
  await apiClient.post("/admin/impersonate/stop");
}
