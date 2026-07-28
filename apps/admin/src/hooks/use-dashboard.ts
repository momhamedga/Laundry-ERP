"use client";

import { useQuery } from "@tanstack/react-query";
import { listCustomers } from "@/services/customers.service";
import { getDashboardStats } from "@/services/dashboard.service";
import { listOrders } from "@/services/orders.service";
import { listPayments } from "@/services/payments.service";
import type { PaymentMethod } from "@/types/payment";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: (branchId?: string) => [...dashboardKeys.all, "stats", branchId ?? null] as const,
  activeCustomers: () => [...dashboardKeys.all, "active-customers"] as const,
  paymentsToday: () => [...dashboardKeys.all, "payments-today"] as const,
  ordersTrend: () => [...dashboardKeys.all, "orders-trend"] as const,
  paymentsByMethod: () => [...dashboardKeys.all, "payments-by-method"] as const,
  recentOrders: () => [...dashboardKeys.all, "recent-orders"] as const,
};

/** كل الأرقام الرئيسية بضربة واحدة - GET /stats/dashboard الموجود */
export function useDashboardStatsQuery(branchId?: string, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.stats(branchId),
    queryFn: () => getDashboardStats({ branchId }),
    enabled,
  });
}

/** عدد العملاء النشطين - GET /customers?isActive=true&limit=1 (يعيد استخدام customers.service.ts بلا تعديل) */
export function useActiveCustomersCountQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.activeCustomers(),
    queryFn: async () => {
      const result = await listCustomers({ isActive: true, limit: 1 });
      return result.meta.total;
    },
    enabled,
  });
}

function todayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** عدد المدفوعات المُسجَّلة اليوم (وليس مبلغها) - GET /payments?dateFrom=dateTo=اليوم&limit=1 */
export function useTodayPaymentsCountQuery(enabled = true) {
  const today = todayDateKey();
  return useQuery({
    queryKey: [...dashboardKeys.paymentsToday(), today] as const,
    queryFn: async () => {
      const result = await listPayments({ dateFrom: today, dateTo: today, limit: 1 });
      return result.meta.total;
    },
    enabled,
  });
}

function dateKeyDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface OrdersTrendPoint {
  date: string;
  orders: number;
}

/**
 * عدد الطلبات لكل يوم من آخر 7 أيام - لا Endpoint إحصائي جديد؛ 7 استدعاءات
 * خفيفة لـ GET /orders (limit=1، meta.total فقط) بنفس نمط بطاقات الإحصاء
 * المُعتمَد سابقاً (Services/Categories Phase 8ه، Payments Summary Cards)
 */
export function useOrdersTrendQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.ordersTrend(),
    queryFn: async () => {
      const days = Array.from({ length: 7 }, (_, i) => dateKeyDaysAgo(6 - i));
      const results = await Promise.all(
        days.map((day) => listOrders({ receivedFrom: day, receivedTo: day, limit: 1 })),
      );
      return days.map((date, i) => ({ date, orders: results[i].meta.total }) as OrdersTrendPoint);
    },
    enabled,
  });
}

const PAYMENT_METHODS: readonly PaymentMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET"];

export interface PaymentsByMethodPoint {
  method: PaymentMethod;
  count: number;
}

/** عدد المدفوعات لكل طريقة (الكل، بلا فلترة زمنية) - 4 استدعاءات خفيفة لـ GET /payments */
export function usePaymentsByMethodQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.paymentsByMethod(),
    queryFn: async () => {
      const results = await Promise.all(
        PAYMENT_METHODS.map((method) => listPayments({ method, limit: 1 })),
      );
      return PAYMENT_METHODS.map(
        (method, i) => ({ method, count: results[i].meta.total }) as PaymentsByMethodPoint,
      );
    },
    enabled,
  });
}

/** آخر 5 طلبات - يعيد استخدام orders.service.ts بلا تعديل */
export function useRecentOrdersQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.recentOrders(),
    queryFn: async () => {
      const result = await listOrders({ limit: 5, sortBy: "createdAt", sortOrder: "desc" });
      return result.orders;
    },
    enabled,
  });
}
