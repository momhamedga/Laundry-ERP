import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";
import type { DashboardStats, DashboardStatsParams } from "@/types/dashboard";

/** Read-Only - GET /stats/dashboard الموجود مسبقاً (Phase 8a) بلا أي Endpoint جديد */
export async function getDashboardStats(params: DashboardStatsParams): Promise<DashboardStats> {
  const query: Record<string, string> = {};
  if (params.branchId) query.branchId = params.branchId;
  const { data } = await apiClient.get<ApiResponse<{ stats: DashboardStats }>>(
    "/stats/dashboard",
    { params: query },
  );
  return data.data.stats;
}
