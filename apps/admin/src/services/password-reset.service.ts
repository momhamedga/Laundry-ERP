import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";
import type { ForgotPasswordInput, ResetPasswordInput } from "@/types/reset-password";

/**
 * POST /auth/forgot-password - استجابة موحدة دائماً بالخادم (لا تكشف وجود
 * البريد من عدمه). الرسالة تُعاد كما هي بالحرف - تُعرض بالواجهة دون صياغة جديدة.
 */
export async function forgotPassword(input: ForgotPasswordInput): Promise<string> {
  const { data } = await apiClient.post<ApiResponse<null>>("/auth/forgot-password", input);
  return data.message ?? "";
}

/** POST /auth/reset-password */
export async function resetPassword(input: ResetPasswordInput): Promise<string> {
  const { data } = await apiClient.post<ApiResponse<null>>("/auth/reset-password", input);
  return data.message ?? "";
}
