"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { inventoryKeys } from "@/lib/query-keys";
import * as service from "@/services/inventory.service";
import type {
  AdjustInput,
  CreateItemInput,
  CreateMovementInput,
  ListItemsParams,
  ListMovementsParams,
  StockCountInput,
  TransferInput,
  UpdateItemInput,
} from "@/types/inventory";

export function useItemsQuery(params: ListItemsParams) {
  return useQuery({
    queryKey: inventoryKeys.items(params),
    queryFn: () => service.listItems(params),
    placeholderData: keepPreviousData,
  });
}

export function useInventoryStatsQuery() {
  return useQuery({ queryKey: inventoryKeys.stats(), queryFn: () => service.getInventoryStats() });
}

export function useMovementsQuery(params: ListMovementsParams) {
  return useQuery({
    queryKey: inventoryKeys.movements(params),
    queryFn: () => service.listMovements(params),
    placeholderData: keepPreviousData,
  });
}

export function useAlertsQuery(params: { page?: number; limit?: number; status?: string; type?: string }) {
  return useQuery({
    queryKey: inventoryKeys.alerts(params),
    queryFn: () => service.listAlerts(params),
    placeholderData: keepPreviousData,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: inventoryKeys.all });
}

export function useCreateItemMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateItemInput) => service.createItem(input),
    onSuccess: () => {
      toast.success("تم إنشاء الصنف");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateItemMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateItemInput }) => service.updateItem(id, input),
    onSuccess: () => {
      toast.success("تم تحديث الصنف");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteItemMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => service.deleteItem(id),
    onSuccess: () => {
      toast.success("تم تعطيل الصنف");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useRestoreItemMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => service.restoreItem(id),
    onSuccess: () => {
      toast.success("تم استرجاع الصنف");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useMovementMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateMovementInput }) =>
      service.createMovement(id, input),
    onSuccess: () => {
      toast.success("تم تسجيل الحركة");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useAdjustMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdjustInput }) => service.adjustItem(id, input),
    onSuccess: () => {
      toast.success("تم تعديل الرصيد");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useTransferMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: TransferInput) => service.transferStock(input),
    onSuccess: () => {
      toast.success("تم التحويل");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useStockCountMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: StockCountInput) => service.stockCount(input),
    onSuccess: () => {
      toast.success("تم تطبيق الجرد");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useResolveAlertMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => service.resolveAlert(id),
    onSuccess: () => {
      toast.success("تم إغلاق التنبيه");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
