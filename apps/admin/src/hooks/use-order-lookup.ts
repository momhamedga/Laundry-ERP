"use client";

import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/services/orders.service";

/** بحث خفيف عن الطلبات - يعيد استخدام orders.service.ts الموجود لتعبئة فلتر الطلب بالمدفوعات */
export function useOrderLookupQuery(query: string) {
  return useQuery({
    queryKey: ["orders", "lookup", query] as const,
    queryFn: () => listOrders({ search: query, limit: 8, sortBy: "createdAt", sortOrder: "desc" }),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}
