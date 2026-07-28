"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import * as categoriesService from "@/services/service-categories.service";
import type {
  CategoryMutationInput,
  ListCategoriesParams,
  ListCategoriesResult,
} from "@/types/service-category";

export const categoryKeys = {
  all: ["service-categories"] as const,
  lists: () => [...categoryKeys.all, "list"] as const,
  list: (params: ListCategoriesParams) => [...categoryKeys.lists(), params] as const,
  stats: () => [...categoryKeys.all, "stats"] as const,
};

// ==================== Queries ====================

export function useCategoriesQuery(params: ListCategoriesParams) {
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: () => categoriesService.listCategories(params),
    placeholderData: keepPreviousData,
  });
}

/** كل التصنيفات (حتى 100) بلا ترقيم - لتعبئة قائمة اختيار التصنيف بنموذج الخدمة */
export function useAllCategoriesQuery() {
  const params: ListCategoriesParams = { limit: 100, sortBy: "sortOrder", sortOrder: "asc" };
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: () => categoriesService.listCategories(params),
    staleTime: 60_000,
  });
}

/** إجمالي/نشط/معطل - من استعلامات list خفيفة (limit=1) بلا أي Endpoint جديد */
export function useCategoryStatsQuery() {
  return useQuery({
    queryKey: categoryKeys.stats(),
    queryFn: async () => {
      const [total, active, inactive] = await Promise.all([
        categoriesService.listCategories({ limit: 1 }),
        categoriesService.listCategories({ limit: 1, isActive: true }),
        categoriesService.listCategories({ limit: 1, isActive: false }),
      ]);
      return {
        total: total.meta.total,
        active: active.meta.total,
        inactive: inactive.meta.total,
      };
    },
    staleTime: 30_000,
  });
}

// ==================== Mutations ====================

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
}

export function useCreateCategoryMutation() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (input: CategoryMutationInput) => categoriesService.createCategory(input),
    onSuccess: () => {
      invalidate();
      toast.success("تم إضافة التصنيف بنجاح");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateCategoryMutation(id: string) {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (input: CategoryMutationInput) => categoriesService.updateCategory(id, input),
    onSuccess: () => {
      invalidate();
      toast.success("تم تحديث التصنيف");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

/** تفعيل/تعطيل - Optimistic (تبديل حالة بسيط وقابل للتراجع بأمان) */
export function useChangeCategoryStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      categoriesService.changeCategoryStatus(id, isActive),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });
      const previousLists = queryClient.getQueriesData<ListCategoriesResult>({
        queryKey: categoryKeys.lists(),
      });
      for (const [key, data] of previousLists) {
        if (!data) continue;
        queryClient.setQueryData<ListCategoriesResult>(key, {
          ...data,
          categories: data.categories.map((c) => (c.id === id ? { ...c, isActive } : c)),
        });
      }
      return { previousLists };
    },
    onError: (error: unknown, _vars, ctx) => {
      ctx?.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(getErrorMessage(error));
    },
    onSuccess: (_data, { isActive }) =>
      toast.success(isActive ? "تم تفعيل التصنيف" : "تم تعطيل التصنيف"),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

/** حذف نهائي - غير Optimistic (إجراء غير قابل للتراجع، ننتظر تأكيد الخادم) */
export function useDeleteCategoryMutation() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: string) => categoriesService.deleteCategory(id),
    onSuccess: () => {
      invalidate();
      toast.success("تم حذف التصنيف نهائياً");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}
