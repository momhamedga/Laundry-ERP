import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  Coupon,
  CouponStats,
  CouponsResult,
  CreateCouponInput,
  ListCouponsParams,
} from "@/types/loyalty";

function toParams<T extends object>(params: T): Record<string, string> {
  const q: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q[k] = String(v);
  return q;
}

export async function listCoupons(params: ListCouponsParams): Promise<CouponsResult> {
  const { data } = await apiClient.get<ApiListResponse<{ coupons: Coupon[] }>>("/coupons", { params: toParams(params) });
  return { coupons: data.data.coupons, meta: data.meta };
}
export async function getCouponStats(): Promise<CouponStats> {
  const { data } = await apiClient.get<ApiResponse<{ stats: CouponStats }>>("/coupons/stats");
  return data.data.stats;
}
export async function createCoupon(input: CreateCouponInput): Promise<Coupon> {
  const { data } = await apiClient.post<ApiResponse<{ coupon: Coupon }>>("/coupons", input);
  return data.data.coupon;
}
export async function updateCoupon(id: string, input: Record<string, unknown>): Promise<Coupon> {
  const { data } = await apiClient.patch<ApiResponse<{ coupon: Coupon }>>(`/coupons/${id}`, input);
  return data.data.coupon;
}
export async function deleteCoupon(id: string): Promise<void> {
  await apiClient.delete(`/coupons/${id}`);
}
export async function validateCoupon(input: { code: string; customerId?: string; orderSubtotal: number }): Promise<{ valid: boolean; discount: number; reason?: string }> {
  const { data } = await apiClient.post<ApiResponse<{ validation: { valid: boolean; discount: number; reason?: string } }>>("/coupons/validate", input);
  return data.data.validation;
}
