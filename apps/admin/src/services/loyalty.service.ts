import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  AccountSummary,
  AccountsResult,
  Campaign,
  CampaignsResult,
  HistoryParams,
  HistoryResult,
  ListAccountsParams,
  LoyaltySettings,
  LoyaltyStats,
} from "@/types/loyalty";

function toParams<T extends object>(params: T): Record<string, string> {
  const q: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q[k] = String(v);
  return q;
}

export async function listAccounts(params: ListAccountsParams): Promise<AccountsResult> {
  const { data } = await apiClient.get<ApiListResponse<{ accounts: AccountsResult["accounts"] }>>(
    "/loyalty/accounts",
    { params: toParams(params) },
  );
  return { accounts: data.data.accounts, meta: data.meta };
}
export async function getSummary(customerId: string): Promise<AccountSummary> {
  const { data } = await apiClient.get<ApiResponse<{ summary: AccountSummary }>>(`/loyalty/accounts/${customerId}`);
  return data.data.summary;
}
export async function listHistory(params: HistoryParams): Promise<HistoryResult> {
  const { data } = await apiClient.get<ApiListResponse<{ transactions: HistoryResult["transactions"] }>>(
    "/loyalty/history",
    { params: toParams(params) },
  );
  return { transactions: data.data.transactions, meta: data.meta };
}
export async function getStats(): Promise<LoyaltyStats> {
  const { data } = await apiClient.get<ApiResponse<{ stats: LoyaltyStats }>>("/loyalty/stats");
  return data.data.stats;
}
export async function getSettings(): Promise<LoyaltySettings> {
  const { data } = await apiClient.get<ApiResponse<{ settings: LoyaltySettings }>>("/loyalty/settings");
  return data.data.settings;
}
export async function updateSettings(input: Record<string, unknown>): Promise<LoyaltySettings> {
  const { data } = await apiClient.put<ApiResponse<{ settings: LoyaltySettings }>>("/loyalty/settings", input);
  return data.data.settings;
}
export async function adjust(input: { customerId: string; points: number; reason: string }): Promise<AccountSummary> {
  const { data } = await apiClient.post<ApiResponse<{ summary: AccountSummary }>>("/loyalty/adjust", input);
  return data.data.summary;
}
export async function grantBonus(input: { customerId: string; type: string; points?: number; note?: string }): Promise<AccountSummary> {
  const { data } = await apiClient.post<ApiResponse<{ summary: AccountSummary }>>("/loyalty/bonus", input);
  return data.data.summary;
}
export async function redeem(input: { customerId: string; points: number; orderId?: string }): Promise<{ discountAmount: number; balanceAfter: number }> {
  const { data } = await apiClient.post<ApiResponse<{ result: { discountAmount: number; balanceAfter: number } }>>("/loyalty/redeem", input);
  return data.data.result;
}
export async function expirePoints(): Promise<{ expiredTransactions: number; expiredPoints: number }> {
  const { data } = await apiClient.post<ApiResponse<{ expiredTransactions: number; expiredPoints: number }>>("/loyalty/expire", {});
  return data.data;
}

// Campaigns
export async function listCampaigns(params: { page?: number; limit?: number }): Promise<CampaignsResult> {
  const { data } = await apiClient.get<ApiListResponse<{ campaigns: Campaign[] }>>("/loyalty/campaigns", { params: toParams(params) });
  return { campaigns: data.data.campaigns, meta: data.meta };
}
export async function createCampaign(input: Record<string, unknown>): Promise<Campaign> {
  const { data } = await apiClient.post<ApiResponse<{ campaign: Campaign }>>("/loyalty/campaigns", input);
  return data.data.campaign;
}
export async function updateCampaign(id: string, input: Record<string, unknown>): Promise<Campaign> {
  const { data } = await apiClient.patch<ApiResponse<{ campaign: Campaign }>>(`/loyalty/campaigns/${id}`, input);
  return data.data.campaign;
}
export async function deleteCampaign(id: string): Promise<void> {
  await apiClient.delete(`/loyalty/campaigns/${id}`);
}
