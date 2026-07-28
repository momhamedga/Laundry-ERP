"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import * as customersService from "@/services/customers.service";
import type {
  Customer,
  CustomerMutationInput,
  CustomerProfile,
  ListCustomersParams,
  ListCustomersResult,
} from "@/types/customer";

export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (params: ListCustomersParams) => [...customerKeys.lists(), params] as const,
  profile: (id: string) => [...customerKeys.all, "profile", id] as const,
};

// ==================== Queries ====================

export function useCustomersQuery(params: ListCustomersParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customersService.listCustomers(params),
    placeholderData: keepPreviousData, // ترقيم سلس بلا وميض بين الصفحات
  });
}

export function useCustomerProfileQuery(id: string) {
  return useQuery({
    queryKey: customerKeys.profile(id),
    queryFn: () => customersService.getCustomerProfile(id),
  });
}

// ==================== Invalidation ====================

function useInvalidateCustomers() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    if (id) void queryClient.invalidateQueries({ queryKey: customerKeys.profile(id) });
  };
}

// ==================== Create / Update / Notes ====================

export function useCreateCustomerMutation() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (input: CustomerMutationInput) => customersService.createCustomer(input),
    onSuccess: () => {
      invalidate();
      toast.success("تم إضافة العميل بنجاح");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateCustomerMutation(id: string) {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (input: CustomerMutationInput) => customersService.updateCustomer(id, input),
    onSuccess: () => {
      invalidate(id);
      toast.success("تم تحديث بيانات العميل");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateCustomerNotesMutation(id: string) {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (notes: string | null) => customersService.updateCustomerNotes(id, notes),
    onSuccess: () => {
      invalidate(id);
      toast.success("تم حفظ الملاحظات");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

// ==================== Delete / Restore (Optimistic) ====================

interface OptimisticContext {
  previousLists: [readonly unknown[], ListCustomersResult | undefined][];
  previousProfile: CustomerProfile | undefined;
}

/** تعديل فوري في الكاش (القائمة + الملف الشخصي إن كان مفتوحاً) قبل تأكيد الخادم */
function patchCachedCustomer(
  queryClient: QueryClient,
  id: string,
  isActive: boolean,
): OptimisticContext {
  const previousLists = queryClient.getQueriesData<ListCustomersResult>({
    queryKey: customerKeys.lists(),
  });
  for (const [key, data] of previousLists) {
    if (!data) continue;
    queryClient.setQueryData<ListCustomersResult>(key, {
      ...data,
      customers: data.customers.map((c) => (c.id === id ? { ...c, isActive } : c)),
    });
  }

  const previousProfile = queryClient.getQueryData<CustomerProfile>(
    customerKeys.profile(id),
  );
  if (previousProfile) {
    queryClient.setQueryData<CustomerProfile>(customerKeys.profile(id), {
      ...previousProfile,
      customer: { ...previousProfile.customer, isActive },
    });
  }

  return { previousLists, previousProfile };
}

function rollbackCustomer(
  queryClient: QueryClient,
  id: string,
  ctx: OptimisticContext | undefined,
): void {
  if (!ctx) return;
  for (const [key, data] of ctx.previousLists) {
    queryClient.setQueryData(key, data);
  }
  if (ctx.previousProfile) {
    queryClient.setQueryData(customerKeys.profile(id), ctx.previousProfile);
  }
}

/** Soft Delete - Optimistic: يعطّل العميل فوراً بالواجهة، ويتراجع عند فشل الخادم */
export function useDeleteCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersService.deleteCustomer(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: customerKeys.all });
      return patchCachedCustomer(queryClient, id, false);
    },
    onError: (error: unknown, id, ctx) => {
      rollbackCustomer(queryClient, id, ctx);
      toast.error(getErrorMessage(error));
    },
    onSuccess: () => toast.success("تم تعطيل العميل"),
    onSettled: (_data: Customer | void, _err, id) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: customerKeys.profile(id) });
    },
  });
}

/** Restore - Optimistic بنفس نمط الحذف */
export function useRestoreCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersService.restoreCustomer(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: customerKeys.all });
      return patchCachedCustomer(queryClient, id, true);
    },
    onError: (error: unknown, id, ctx) => {
      rollbackCustomer(queryClient, id, ctx);
      toast.error(getErrorMessage(error));
    },
    onSuccess: () => toast.success("تم استعادة العميل"),
    onSettled: (_data, _err, id) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: customerKeys.profile(id) });
    },
  });
}
