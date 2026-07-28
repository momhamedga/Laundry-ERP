"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { dayClosingKeys } from "@/lib/query-keys";
import * as service from "@/services/day-closing.service";
import type {
  CashMovementInput,
  CloseDayInput,
  ListDayClosingsParams,
  OpenDayInput,
} from "@/types/day-closing";

export function useDayDashboardQuery() {
  return useQuery({
    queryKey: dayClosingKeys.dashboard(),
    queryFn: () => service.getDashboard(),
  });
}

export function usePreCloseCheckQuery(enabled: boolean) {
  return useQuery({
    queryKey: dayClosingKeys.preClose(),
    queryFn: () => service.getPreCloseCheck(),
    enabled,
  });
}

export function useDayHistoryQuery(params: ListDayClosingsParams) {
  return useQuery({
    queryKey: dayClosingKeys.history(params),
    queryFn: () => service.listHistory(params),
  });
}

export function useDayClosingQuery(id: string | null) {
  return useQuery({
    queryKey: dayClosingKeys.detail(id ?? ""),
    queryFn: () => service.getById(id as string),
    enabled: !!id,
  });
}

function useInvalidateDay() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: dayClosingKeys.all });
}

export function useOpenDayMutation() {
  const invalidate = useInvalidateDay();
  return useMutation({
    mutationFn: (input: OpenDayInput) => service.openDay(input),
    onSuccess: () => {
      toast.success("تم فتح يوم العمل");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useCloseDayMutation() {
  const invalidate = useInvalidateDay();
  return useMutation({
    mutationFn: (input: CloseDayInput) => service.closeDay(input),
    onSuccess: () => {
      toast.success("تم إغلاق يوم العمل");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useCashMovementMutation() {
  const invalidate = useInvalidateDay();
  return useMutation({
    mutationFn: (input: CashMovementInput) => service.cashMovement(input),
    onSuccess: () => {
      toast.success("تم تسجيل الحركة النقدية");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useReopenDayMutation() {
  const invalidate = useInvalidateDay();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => service.reopenDay(id, reason),
    onSuccess: () => {
      toast.success("تمت إعادة فتح اليوم");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useApproveDayMutation() {
  const invalidate = useInvalidateDay();
  return useMutation({
    mutationFn: (id: string) => service.approveDay(id),
    onSuccess: () => {
      toast.success("تم اعتماد اليوم");
      invalidate();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
