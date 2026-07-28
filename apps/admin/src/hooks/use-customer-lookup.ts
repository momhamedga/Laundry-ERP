"use client";

import { useQuery } from "@tanstack/react-query";
import { customerLookupKeys } from "@/lib/query-keys";
import { listCustomers } from "@/services/customers.service";

/** بحث خفيف عن العملاء - يعيد استخدام customers.service.ts الموجود لتعبئة فلتر العميل بالطلبات */
export function useCustomerLookupQuery(query: string) {
  return useQuery({
    queryKey: customerLookupKeys.search(query),
    queryFn: () => listCustomers({ search: query, limit: 8 }),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}
