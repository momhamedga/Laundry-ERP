"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import * as usersService from "@/services/users.service";
import type { UserRole } from "@/types";
import type {
  ActivityParams,
  CreateUserInput,
  ListUsersParams,
  UpdateUserInput,
} from "@/types/user";

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params: ListUsersParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  activity: (id: string, params: ActivityParams) =>
    [...userKeys.all, "activity", id, params] as const,
};

// ==================== Queries ====================

export function useUsersQuery(params: ListUsersParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersService.listUsers(params),
    placeholderData: keepPreviousData,
  });
}

export function useUserDetailQuery(id: string | null) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ""),
    queryFn: () => usersService.getUser(id as string),
    enabled: !!id,
  });
}

export function useUserActivityQuery(id: string | null, params: ActivityParams, enabled = true) {
  return useQuery({
    queryKey: userKeys.activity(id ?? "", params),
    queryFn: () => usersService.getUserActivity(id as string, params),
    enabled: !!id && enabled,
    placeholderData: keepPreviousData,
  });
}

// ==================== Invalidation ====================

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    if (id) void queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
  };
}

// ==================== Mutations ====================

export function useCreateUserMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersService.createUser(input),
    onSuccess: () => {
      invalidate();
      toast.success("تم إنشاء المستخدم بنجاح");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateUserMutation(id: string) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => usersService.updateUser(id, input),
    onSuccess: () => {
      invalidate(id);
      toast.success("تم تحديث بيانات المستخدم");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useAssignUserRoleMutation(id: string) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (role: UserRole) => usersService.assignUserRole(id, role),
    onSuccess: () => invalidate(id),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useChangeUserStatusMutation(id: string) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (isActive: boolean) => usersService.changeUserStatus(id, isActive),
    onSuccess: (_user, isActive) => {
      invalidate(id);
      toast.success(isActive ? "تم تفعيل المستخدم" : "تم تعطيل المستخدم");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useAdminResetPasswordMutation(id: string) {
  return useMutation({
    mutationFn: (newPassword: string) => usersService.adminResetPassword(id, newPassword),
    onSuccess: () => toast.success("تم تغيير كلمة السر - سيُطلب من المستخدم تسجيل الدخول مجدداً"),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}
