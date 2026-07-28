"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { membershipKeys } from "@/lib/query-keys";
import * as service from "@/services/membership.service";
import type { MembershipLevel, UpdateTierInput } from "@/types/loyalty";

export function useTiersQuery() {
  return useQuery({ queryKey: membershipKeys.tiers(), queryFn: () => service.listTiers() });
}
export function useDistributionQuery() {
  return useQuery({ queryKey: membershipKeys.distribution(), queryFn: () => service.getDistribution() });
}

export function useUpdateTierMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ level, input }: { level: MembershipLevel; input: UpdateTierInput }) => service.updateTier(level, input),
    onSuccess: () => {
      toast.success("تم تحديث المستوى");
      void qc.invalidateQueries({ queryKey: membershipKeys.all });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
