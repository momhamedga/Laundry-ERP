import { apiClient, authHttp } from "@/lib/axios";
import type { ApiResponse, AuthUser } from "@/types";
import type { SessionInfo } from "@/types/session";

/**
 * طبقة خدمات المصادقة - تستدعي الـ Backend الحقيقي
 * refresh/logout عبر authHttp (عميل خام بلا interceptors لمنع الحلقات)
 */

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  user: AuthUser;
  accessToken: string;
  expiresInSec: number;
}

export interface RefreshResult {
  accessToken: string;
  expiresInSec: number;
}

export async function loginRequest(payload: LoginPayload): Promise<LoginResult> {
  const { data } = await apiClient.post<ApiResponse<LoginResult>>(
    "/auth/login",
    payload,
  );
  return data.data;
}

/** يعتمد على HttpOnly Refresh Cookie - مع Rotation بالخادم */
export async function refreshRequest(): Promise<RefreshResult> {
  const { data } = await authHttp.post<ApiResponse<RefreshResult>>("/auth/refresh");
  return data.data;
}

export async function logoutRequest(): Promise<void> {
  await authHttp.post("/auth/logout");
}

export async function meRequest(): Promise<AuthUser> {
  const { data } = await apiClient.get<ApiResponse<{ user: AuthUser }>>("/auth/me");
  return data.data.user;
}

/** GET /auth/sessions - مصفوفة خام بلا Pagination (لا صفحات بالخادم لهذه القائمة) */
export async function listSessionsRequest(): Promise<SessionInfo[]> {
  const { data } = await apiClient.get<ApiResponse<{ sessions: SessionInfo[] }>>("/auth/sessions");
  return data.data.sessions;
}

/** DELETE /auth/sessions - sessionId بجسم الطلب وليس بالمسار (تصميم الخادم الفعلي) */
export async function revokeSessionRequest(sessionId: string): Promise<void> {
  await apiClient.delete("/auth/sessions", { data: { sessionId } });
}
