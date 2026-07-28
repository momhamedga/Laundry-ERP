"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { loyaltyKeys } from "@/lib/query-keys";
import * as service from "@/services/loyalty.service";
import type { HistoryParams, ListAccountsParams } from "@/types/loyalty";

export function useAccountsQuery(params: ListAccountsParams) {
  return useQuery({ queryKey: loyaltyKeys.accounts(params), queryFn: () => service.listAccounts(params), placeholderData: keepPreviousData });
}
export function useLoyaltyHistoryQuery(params: HistoryParams) {
  return useQuery({ queryKey: loyaltyKeys.history(params), queryFn: () => service.listHistory(params), placeholderData: keepPreviousData });
}
export function useLoyaltyStatsQuery() {
  return useQuery({ queryKey: loyaltyKeys.stats(), queryFn: () => service.getStats() });
}
export function useLoyaltySettingsQuery() {
  return useQuery({ queryKey: loyaltyKeys.settings(), queryFn: () => service.getSettings() });
}
export function useCampaignsQuery(params: { page?: number; limit?: number }) {
  return useQuery({ queryKey: loyaltyKeys.campaigns(params), queryFn: () => service.listCampaigns(params), placeholderData: keepPreviousData });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: loyaltyKeys.all });
}

export function useAdjustMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { customerId: string; points: number; reason: string }) => service.adjust(input),
    onSuccess: () => { toast.success("تم تعديل النقاط"); invalidate(); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
export function useBonusMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { customerId: string; type: string; points?: number }) => service.grantBonus(input),
    onSuccess: () => { toast.success("تمت المكافأة"); invalidate(); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
export function useUpdateLoyaltySettingsMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => service.updateSettings(input),
    onSuccess: () => { toast.success("تم تحديث الإعدادات"); invalidate(); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
export function useExpirePointsMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => service.expirePoints(),
    onSuccess: (r) => { toast.success(`انتهت ${r.expiredPoints} نقطة`); invalidate(); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
export function useCreateCampaignMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => service.createCampaign(input),
    onSuccess: () => { toast.success("تم إنشاء الحملة"); invalidate(); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
export function useUpdateCampaignMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => service.updateCampaign(id, input),
    onSuccess: () => { toast.success("تم تحديث الحملة"); invalidate(); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
export function useDeleteCampaignMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => service.deleteCampaign(id),
    onSuccess: () => { toast.success("تم حذف الحملة"); invalidate(); },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
