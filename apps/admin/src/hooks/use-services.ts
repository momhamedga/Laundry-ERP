"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import * as categoriesService from "@/services/service-categories.service";
import * as servicesService from "@/services/services.service";
import type {
  CreateServiceInput,
  ListServicesParams,
  ListServicesResult,
  ServiceMutationInput,
} from "@/types/service";

export const serviceKeys = {
  all: ["services"] as const,
  lists: () => [...serviceKeys.all, "list"] as const,
  list: (params: ListServicesParams) => [...serviceKeys.lists(), params] as const,
  stats: () => [...serviceKeys.all, "stats"] as const,
};

// ==================== Queries ====================

export function useServicesQuery(params: ListServicesParams) {
  return useQuery({
    queryKey: serviceKeys.list(params),
    queryFn: () => servicesService.listServices(params),
    placeholderData: keepPreviousData,
  });
}

/** إجمالي/نشط/معطل + عدد التصنيفات - من استعلامات list خفيفة بلا أي Endpoint جديد */
export function useServiceStatsQuery() {
  return useQuery({
    queryKey: serviceKeys.stats(),
    queryFn: async () => {
      const [total, active, inactive, categoriesTotal] = await Promise.all([
        servicesService.listServices({ limit: 1 }),
        servicesService.listServices({ limit: 1, isActive: true }),
        servicesService.listServices({ limit: 1, isActive: false }),
        categoriesService.listCategories({ limit: 1 }),
      ]);
      return {
        total: total.meta.total,
        active: active.meta.total,
        inactive: inactive.meta.total,
        categories: categoriesTotal.meta.total,
      };
    },
    staleTime: 30_000,
  });
}

// ==================== Create / Update ====================

function useInvalidateServices() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: serviceKeys.all });
}

export function useCreateServiceMutation() {
  const invalidate = useInvalidateServices();
  return useMutation({
    mutationFn: (input: CreateServiceInput) => servicesService.createService(input),
    onSuccess: () => {
      invalidate();
      toast.success("تم إضافة الخدمة بنجاح");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateServiceMutation(id: string) {
  const invalidate = useInvalidateServices();
  return useMutation({
    mutationFn: (input: ServiceMutationInput) => servicesService.updateService(id, input),
    onSuccess: () => {
      invalidate();
      toast.success("تم تحديث الخدمة");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

// ==================== Delete / Restore (Optimistic) ====================

interface OptimisticServiceContext {
  previousLists: [readonly unknown[], ListServicesResult | undefined][];
}

function patchCachedService(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  isActive: boolean,
): OptimisticServiceContext {
  const previousLists = queryClient.getQueriesData<ListServicesResult>({
    queryKey: serviceKeys.lists(),
  });
  for (const [key, data] of previousLists) {
    if (!data) continue;
    queryClient.setQueryData<ListServicesResult>(key, {
      ...data,
      services: data.services.map((s) =>
        s.id === id ? { ...s, isActive, available: isActive && s.category.isActive } : s,
      ),
    });
  }
  return { previousLists };
}

function rollbackServices(
  queryClient: ReturnType<typeof useQueryClient>,
  ctx: OptimisticServiceContext | undefined,
): void {
  ctx?.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

/** Soft Delete - Optimistic: يعطّل الخدمة فوراً بالواجهة */
export function useDeleteServiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => servicesService.deleteService(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: serviceKeys.all });
      return patchCachedService(queryClient, id, false);
    },
    onError: (error: unknown, _id, ctx) => {
      rollbackServices(queryClient, ctx);
      toast.error(getErrorMessage(error));
    },
    onSuccess: () => toast.success("تم تعطيل الخدمة"),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: serviceKeys.lists() }),
  });
}

/** Restore - Optimistic بنفس نمط الحذف */
export function useRestoreServiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => servicesService.restoreService(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: serviceKeys.all });
      return patchCachedService(queryClient, id, true);
    },
    onError: (error: unknown, _id, ctx) => {
      rollbackServices(queryClient, ctx);
      toast.error(getErrorMessage(error));
    },
    onSuccess: () => toast.success("تم استعادة الخدمة"),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: serviceKeys.lists() }),
  });
}
