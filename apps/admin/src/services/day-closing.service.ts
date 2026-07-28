import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  CashMovementInput,
  CloseDayInput,
  DayClosingDashboard,
  DayClosingView,
  ListDayClosingsParams,
  OpenDayInput,
  PaginationMeta,
  PreCloseCheckResult,
} from "@/types/day-closing";

export async function getDashboard(): Promise<DayClosingDashboard> {
  const { data } =
    await apiClient.get<ApiResponse<{ dashboard: DayClosingDashboard }>>("/day-closing/dashboard");
  return data.data.dashboard;
}

export async function getPreCloseCheck(): Promise<PreCloseCheckResult> {
  const { data } =
    await apiClient.get<ApiResponse<{ check: PreCloseCheckResult }>>("/day-closing/pre-close-check");
  return data.data.check;
}

export async function getCurrent(): Promise<DayClosingView | null> {
  const { data } =
    await apiClient.get<ApiResponse<{ current: DayClosingView | null }>>("/day-closing/current");
  return data.data.current;
}

export async function getById(id: string): Promise<DayClosingView> {
  const { data } = await apiClient.get<ApiResponse<{ closing: DayClosingView }>>(`/day-closing/${id}`);
  return data.data.closing;
}

export async function listHistory(
  params: ListDayClosingsParams,
): Promise<{ closings: DayClosingView[]; meta: PaginationMeta }> {
  const { data } = await apiClient.get<ApiListResponse<{ closings: DayClosingView[] }>>(
    "/day-closing/history",
    { params },
  );
  return { closings: data.data.closings, meta: data.meta as PaginationMeta };
}

export async function openDay(input: OpenDayInput): Promise<DayClosingView> {
  const { data } = await apiClient.post<ApiResponse<{ closing: DayClosingView }>>(
    "/day-closing/open",
    input,
  );
  return data.data.closing;
}

export async function closeDay(input: CloseDayInput): Promise<DayClosingView> {
  const { data } = await apiClient.post<ApiResponse<{ closing: DayClosingView }>>(
    "/day-closing/close",
    input,
  );
  return data.data.closing;
}

export async function cashMovement(input: CashMovementInput): Promise<DayClosingView> {
  const { data } = await apiClient.post<ApiResponse<{ closing: DayClosingView }>>(
    "/day-closing/cash-movement",
    input,
  );
  return data.data.closing;
}

export async function reopenDay(id: string, reason: string): Promise<DayClosingView> {
  const { data } = await apiClient.post<ApiResponse<{ closing: DayClosingView }>>(
    `/day-closing/${id}/reopen`,
    { reason },
  );
  return data.data.closing;
}

export async function approveDay(id: string): Promise<DayClosingView> {
  const { data } = await apiClient.post<ApiResponse<{ closing: DayClosingView }>>(
    `/day-closing/${id}/approve`,
  );
  return data.data.closing;
}
