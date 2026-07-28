"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { branchKeys } from "@/lib/query-keys";
import * as branchesService from "@/services/branches.service";
import type { CreateBranchInput, ListBranchesParams, UpdateBranchInput } from "@/types/branch";

/** الفروع النشطة - لتعبئة فلتر الفرع (نادراً ما تتغير) */
export function useActiveBranchesQuery() {
  return useQuery({
    queryKey: branchKeys.lists(),
    queryFn: () => branchesService.listActiveBranches(),
    staleTime: 5 * 60_000,
  });
}

// ==================== Branches Management (Full CRUD) ====================

export function useBranchesQuery(params: ListBranchesParams) {
  return useQuery({
    queryKey: branchKeys.list(params),
    queryFn: () => branchesService.listBranches(params),
    placeholderData: keepPreviousData,
  });
}

export function useBranchDetailQuery(id: string | null) {
  return useQuery({
    queryKey: branchKeys.detail(id ?? ""),
    queryFn: () => branchesService.getBranch(id as string),
    enabled: !!id,
  });
}

function useInvalidateBranches() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: branchKeys.all });
    if (id) void queryClient.invalidateQueries({ queryKey: branchKeys.detail(id) });
  };
}

export function useCreateBranchMutation() {
  const invalidate = useInvalidateBranches();
  return useMutation({
    mutationFn: (input: CreateBranchInput) => branchesService.createBranch(input),
    onSuccess: () => {
      invalidate();
      toast.success("تم إضافة الفرع بنجاح");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateBranchMutation(id: string) {
  const invalidate = useInvalidateBranches();
  return useMutation({
    mutationFn: (input: UpdateBranchInput) => branchesService.updateBranch(id, input),
    onSuccess: () => {
      invalidate(id);
      toast.success("تم تحديث بيانات الفرع");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useChangeBranchStatusMutation(id: string) {
  const invalidate = useInvalidateBranches();
  return useMutation({
    mutationFn: (isActive: boolean) => branchesService.changeBranchStatus(id, isActive),
    onSuccess: (_branch, isActive) => {
      invalidate(id);
      toast.success(isActive ? "تم تفعيل الفرع" : "تم تعطيل الفرع");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteBranchMutation() {
  const invalidate = useInvalidateBranches();
  return useMutation({
    mutationFn: (id: string) => branchesService.deleteBranch(id),
    onSuccess: () => {
      invalidate();
      toast.success("تم حذف الفرع");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}
