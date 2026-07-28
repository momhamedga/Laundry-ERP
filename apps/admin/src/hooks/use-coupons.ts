"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { couponKeys } from "@/lib/query-keys";
import * as service from "@/services/coupons.service";
import type { CreateCouponInput, ListCouponsParams } from "@/types/loyalty";

export function useCouponsQuery(params: ListCouponsParams) {
  return useQuery({ queryKey: couponKeys.list(params), queryFn: () => service.listCoupons(params), placeholderData: keepPreviousData });
}
export function useCouponStatsQuery() {
  return useQuery({ queryKey: couponKeys.stats(), queryFn: () => service.getCouponStats() });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: couponKeys.all });
}

export function useCreateCouponMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateCouponInput) => service.createCoupon(input),
    onSuccess: () => { toast.success("تم إنشاء الكوبون"); invalidate(); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
export function useUpdateCouponMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => service.updateCoupon(id, input),
    onSuccess: () => { toast.success("تم تحديث الكوبون"); invalidate(); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
export function useDeleteCouponMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => service.deleteCoupon(id),
    onSuccess: () => { toast.success("تم حذف الكوبون"); invalidate(); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
