"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { purchaseKeys } from "@/lib/query-keys";
import * as service from "@/services/purchases.service";
import type { CreatePurchaseInput, ListPurchasesParams } from "@/types/inventory";

export function usePurchasesQuery(params: ListPurchasesParams) {
  return useQuery({
    queryKey: purchaseKeys.list(params),
    queryFn: () => service.listPurchases(params),
    placeholderData: keepPreviousData,
  });
}

export function usePurchaseQuery(id: string | null) {
  return useQuery({
    queryKey: purchaseKeys.detail(id ?? "none"),
    queryFn: () => service.getPurchase(id as string),
    enabled: id !== null,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: purchaseKeys.all });
    void qc.invalidateQueries({ queryKey: ["inventory"] });
  };
}

export function useCreatePurchaseMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreatePurchaseInput) => service.createPurchase(input),
    onSuccess: () => {
      toast.success("تم إنشاء أمر الشراء");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useDeletePurchaseMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => service.deletePurchase(id),
    onSuccess: () => {
      toast.success("تم حذف أمر الشراء");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useReceivePurchaseMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => service.receivePurchase(id),
    onSuccess: () => {
      toast.success("تم استلام الشراء وتحديث المخزون");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useCancelPurchaseMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => service.cancelPurchase(id),
    onSuccess: () => {
      toast.success("تم إلغاء أمر الشراء");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
