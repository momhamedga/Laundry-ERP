"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { SortOrder } from "@/types";
import type {
  ListOrdersParams,
  OrderSortField,
  OrderStatus,
  PaymentStatus,
} from "@/types/orders";

export interface OrdersFilters extends ListOrdersParams {
  /** اسم العميل المختار للعرض بالفلتر فقط - customerId هو ما يُرسل للخادم */
  customerName?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const SORTABLE_FIELDS: readonly OrderSortField[] = [
  "receivedAt",
  "dueDate",
  "total",
  "orderNumber",
  "createdAt",
];

const STATUSES: readonly OrderStatus[] = [
  "RECEIVED",
  "INSPECTING",
  "WASHING",
  "DRYING",
  "IRONING",
  "PACKING",
  "READY",
  "DELIVERED",
  "CANCELLED",
];

const PAYMENT_STATUSES: readonly PaymentStatus[] = ["UNPAID", "PARTIAL", "PAID", "REFUNDED"];

function parseSortField(raw: string | null): OrderSortField {
  return (SORTABLE_FIELDS as readonly string[]).includes(raw ?? "")
    ? (raw as OrderSortField)
    : "receivedAt";
}

function parseStatus(raw: string | null): OrderStatus | undefined {
  return (STATUSES as readonly string[]).includes(raw ?? "") ? (raw as OrderStatus) : undefined;
}

function parsePaymentStatus(raw: string | null): PaymentStatus | undefined {
  return (PAYMENT_STATUSES as readonly string[]).includes(raw ?? "")
    ? (raw as PaymentStatus)
    : undefined;
}

/** حالة فلاتر قائمة الطلبات مُشتقة من رابط الصفحة */
export function useOrdersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<OrdersFilters>(() => {
    const page = Number(searchParams.get("page"));
    const limit = Number(searchParams.get("limit"));
    const sortOrder: SortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    return {
      page: Number.isFinite(page) && page > 0 ? page : DEFAULT_PAGE,
      limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
      search: searchParams.get("search") ?? undefined,
      status: parseStatus(searchParams.get("status")),
      paymentStatus: parsePaymentStatus(searchParams.get("paymentStatus")),
      customerId: searchParams.get("customerId") ?? undefined,
      customerName: searchParams.get("customerName") ?? undefined,
      branchId: searchParams.get("branchId") ?? undefined,
      receivedFrom: searchParams.get("receivedFrom") ?? undefined,
      receivedTo: searchParams.get("receivedTo") ?? undefined,
      sortBy: parseSortField(searchParams.get("sortBy")),
      sortOrder,
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<OrdersFilters>) => {
      const next: OrdersFilters = { ...filters, ...patch };
      if (!("page" in patch)) next.page = DEFAULT_PAGE;

      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(next)) {
        if (value !== undefined && value !== "") params.set(key, String(value));
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [filters, pathname, router],
  );

  const resetFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  return { filters, setFilters, resetFilters };
}
