"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import * as authService from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import type { AuthUser } from "@/types";

/** مفتاح استعلامات المصادقة */
export const AUTH_QUERY_KEY = ["auth", "me"] as const;

/**
 * Current User Query - يُبقي بيانات المستخدم حديثة أثناء الجلسة
 * (المصدر الفوري هو الـ store؛ الاستعلام للمزامنة الدورية)
 */
export function useCurrentUserQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);

  return useQuery<AuthUser | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      await fetchCurrentUser();
      return useAuthStore.getState().user;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}

/** تسجيل خروج موحد: API + تنظيف الـ store + إفراغ كاش React Query + توجيه */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  return useCallback(async () => {
    await logout();
    queryClient.clear(); // Invalidate عند Logout
    toast.success("تم تسجيل الخروج");
    router.replace("/login");
  }, [logout, queryClient, router]);
}

// ==================== Sessions Management ====================

export const sessionKeys = {
  all: ["auth", "sessions"] as const,
  list: () => [...sessionKeys.all, "list"] as const,
};

/** الجلسات النشطة للمستخدم الحالي - GET /auth/sessions (مصفوفة خام بلا Pagination) */
export function useSessionsQuery() {
  return useQuery({
    queryKey: sessionKeys.list(),
    queryFn: () => authService.listSessionsRequest(),
  });
}

function useInvalidateSessions() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: sessionKeys.list() });
}

/** تسجيل خروج من جلسة محددة (غير الحالية) - إبطال القائمة فقط، بلا Redirect ولا Refresh */
export function useRevokeSessionMutation() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: (sessionId: string) => authService.revokeSessionRequest(sessionId),
    onSuccess: () => {
      invalidate();
      toast.success("تم تسجيل الخروج من الجلسة");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

/**
 * "تسجيل الخروج من كل الأجهزة الأخرى" - لا Endpoint مخصص لهذه العملية
 * بالخادم؛ مُركَّبة من استدعاءات حقيقية متعددة لنفس DELETE /auth/sessions
 * الموجود (كل استدعاء فعلي ومُدقَّق بذاته عبر Audit Log - وليس محاكاة)،
 * بنفس فلسفة تركيب بطاقات لوحة التحكم من عدة نداءات list بدل Endpoint
 * إحصائي مخصص غير موجود.
 */
export function useRevokeAllOtherSessionsMutation() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: (sessionIds: string[]) =>
      Promise.all(sessionIds.map((id) => authService.revokeSessionRequest(id))),
    onSuccess: () => {
      invalidate();
      toast.success("تم تسجيل الخروج من كل الأجهزة الأخرى");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}
