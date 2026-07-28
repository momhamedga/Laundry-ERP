"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { SortOrder } from "@/types";
import type {
  ListPaymentsParams,
  PaymentMethod,
  PaymentSortField,
  PaymentTxStatus,
} from "@/types/payment";

export interface PaymentsFilters extends ListPaymentsParams {
  /** رقم الطلب المختار للعرض فقط بفلتر الطلب - orderId هو ما يُرسل للخادم */
  orderNumber?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const SORTABLE_FIELDS: readonly PaymentSortField[] = ["createdAt", "amount"];
const METHODS: readonly PaymentMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET"];
const STATUSES: readonly PaymentTxStatus[] = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
];

function parseSortField(raw: string | null): PaymentSortField {
  return (SORTABLE_FIELDS as readonly string[]).includes(raw ?? "")
    ? (raw as PaymentSortField)
    : "createdAt";
}

function parseMethod(raw: string | null): PaymentMethod | undefined {
  return (METHODS as readonly string[]).includes(raw ?? "") ? (raw as PaymentMethod) : undefined;
}

function parseStatus(raw: string | null): PaymentTxStatus | undefined {
  return (STATUSES as readonly string[]).includes(raw ?? "")
    ? (raw as PaymentTxStatus)
    : undefined;
}

function parseAmount(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** حالة فلاتر قائمة المدفوعات مُشتقة من رابط الصفحة - بنفس نمط useOrdersFilters */
export function usePaymentsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<PaymentsFilters>(() => {
    const page = Number(searchParams.get("page"));
    const limit = Number(searchParams.get("limit"));
    const sortOrder: SortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    return {
      page: Number.isFinite(page) && page > 0 ? page : DEFAULT_PAGE,
      limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
      search: searchParams.get("search") ?? undefined,
      orderId: searchParams.get("orderId") ?? undefined,
      orderNumber: searchParams.get("orderNumber") ?? undefined,
      method: parseMethod(searchParams.get("method")),
      status: parseStatus(searchParams.get("status")),
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      minAmount: parseAmount(searchParams.get("minAmount")),
      maxAmount: parseAmount(searchParams.get("maxAmount")),
      sortBy: parseSortField(searchParams.get("sortBy")),
      sortOrder,
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<PaymentsFilters>) => {
      const next: PaymentsFilters = { ...filters, ...patch };
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
