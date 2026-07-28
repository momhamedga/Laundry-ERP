import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";
import type {
  MembershipDistributionRow,
  MembershipLevel,
  MembershipTier,
  UpdateTierInput,
} from "@/types/loyalty";

export async function listTiers(): Promise<MembershipTier[]> {
  const { data } = await apiClient.get<ApiResponse<{ tiers: MembershipTier[] }>>("/membership/tiers");
  return data.data.tiers;
}
export async function getDistribution(): Promise<MembershipDistributionRow[]> {
  const { data } = await apiClient.get<ApiResponse<{ distribution: MembershipDistributionRow[] }>>("/membership/distribution");
  return data.data.distribution;
}
export async function updateTier(level: MembershipLevel, input: UpdateTierInput): Promise<MembershipTier> {
  const { data } = await apiClient.patch<ApiResponse<{ tier: MembershipTier }>>(`/membership/tiers/${level}`, input);
  return data.data.tier;
}
export async function setLevel(input: { customerId: string; level: MembershipLevel }): Promise<void> {
  await apiClient.post("/membership/set-level", input);
}
