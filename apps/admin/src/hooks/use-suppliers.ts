"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { supplierKeys } from "@/lib/query-keys";
import * as service from "@/services/suppliers.service";
import type { CreateSupplierInput, ListSuppliersParams, UpdateSupplierInput } from "@/types/inventory";

export function useSuppliersQuery(params: ListSuppliersParams) {
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: () => service.listSuppliers(params),
    placeholderData: keepPreviousData,
  });
}

export function useSupplierStatsQuery(id: string, enabled: boolean) {
  return useQuery({
    queryKey: supplierKeys.stats(id),
    queryFn: () => service.getSupplierStats(id),
    enabled,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: supplierKeys.all });
}

export function useCreateSupplierMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateSupplierInput) => service.createSupplier(input),
    onSuccess: () => {
      toast.success("تم إنشاء المورّد");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateSupplierMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSupplierInput }) =>
      service.updateSupplier(id, input),
    onSuccess: () => {
      toast.success("تم تحديث المورّد");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useDisableSupplierMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => service.disableSupplier(id),
    onSuccess: () => {
      toast.success("تم تعطيل المورّد");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useRestoreSupplierMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => service.restoreSupplier(id),
    onSuccess: () => {
      toast.success("تم استرجاع المورّد");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
