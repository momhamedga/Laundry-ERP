"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { adminKeys } from "@/lib/query-keys";
import * as service from "@/services/admin.service";
import type { ForceLogoutInput, ListLoginHistoryParams } from "@/types/admin";

export function useSecurityCenterQuery() {
  return useQuery({
    queryKey: adminKeys.securityCenter(),
    queryFn: () => service.getSecurityCenter(),
  });
}

export function usePermissionMatrixQuery() {
  return useQuery({
    queryKey: adminKeys.permissionMatrix(),
    queryFn: () => service.getPermissionMatrix(),
    staleTime: 5 * 60_000,
  });
}

export function useLoginHistoryQuery(params: ListLoginHistoryParams) {
  return useQuery({
    queryKey: adminKeys.loginHistory(params),
    queryFn: () => service.listLoginHistory(params),
  });
}

export function useUserSessionsQuery(userId: string | null) {
  return useQuery({
    queryKey: adminKeys.userSessions(userId ?? ""),
    queryFn: () => service.getUserSessions(userId as string),
    enabled: !!userId,
  });
}

export function useKillSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => service.killSession(sessionId),
    onSuccess: () => {
      toast.success("تم إنهاء الجلسة");
      void qc.invalidateQueries({ queryKey: adminKeys.all });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useForceLogoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ForceLogoutInput) => service.forceLogout(input),
    onSuccess: (result) => {
      toast.success(`تم الإخراج القسري - أُبطلت ${result.revoked} جلسة`);
      void qc.invalidateQueries({ queryKey: adminKeys.all });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

// ==================== Phase 9.6c ====================

export function useUserPermissionsQuery(userId: string | null) {
  return useQuery({
    queryKey: [...adminKeys.all, "user-permissions", userId ?? ""],
    queryFn: () => service.getUserPermissions(userId as string),
    enabled: !!userId,
  });
}

export function useSetOverrideMutation(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ permission, granted }: { permission: string; granted: boolean }) =>
      service.setUserOverride(userId, permission, granted),
    onSuccess: () => {
      toast.success("تم حفظ التجاوز");
      void qc.invalidateQueries({ queryKey: [...adminKeys.all, "user-permissions", userId] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useRemoveOverrideMutation(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (permission: string) => service.removeUserOverride(userId, permission),
    onSuccess: () => {
      toast.success("تمت إزالة التجاوز");
      void qc.invalidateQueries({ queryKey: [...adminKeys.all, "user-permissions", userId] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
