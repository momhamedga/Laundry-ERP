"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { SortOrder } from "@/types";
import type { InvoiceSortField, InvoiceStatus, ListInvoicesParams } from "@/types/invoice";

export interface InvoicesFilters extends ListInvoicesParams {
  /** اسم العميل المختار للعرض فقط بالفلتر - customerId هو ما يُرسل للخادم */
  customerName?: string;
  /** رقم الطلب المختار للعرض فقط بالفلتر - orderId هو ما يُرسل للخادم */
  orderNumber?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const SORTABLE_FIELDS: readonly InvoiceSortField[] = [
  "issuedAt",
  "dueDate",
  "total",
  "invoiceNumber",
  "createdAt",
];
const STATUSES: readonly InvoiceStatus[] = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"];

function parseSortField(raw: string | null): InvoiceSortField {
  return (SORTABLE_FIELDS as readonly string[]).includes(raw ?? "")
    ? (raw as InvoiceSortField)
    : "issuedAt";
}

function parseStatus(raw: string | null): InvoiceStatus | undefined {
  return (STATUSES as readonly string[]).includes(raw ?? "") ? (raw as InvoiceStatus) : undefined;
}

/** حالة فلاتر قائمة الفواتير مُشتقة من رابط الصفحة - بنفس نمط usePaymentsFilters */
export function useInvoicesFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<InvoicesFilters>(() => {
    const page = Number(searchParams.get("page"));
    const limit = Number(searchParams.get("limit"));
    const sortOrder: SortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    return {
      page: Number.isFinite(page) && page > 0 ? page : DEFAULT_PAGE,
      limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
      search: searchParams.get("search") ?? undefined,
      status: parseStatus(searchParams.get("status")),
      customerId: searchParams.get("customerId") ?? undefined,
      customerName: searchParams.get("customerName") ?? undefined,
      branchId: searchParams.get("branchId") ?? undefined,
      orderId: searchParams.get("orderId") ?? undefined,
      orderNumber: searchParams.get("orderNumber") ?? undefined,
      issuedFrom: searchParams.get("issuedFrom") ?? undefined,
      issuedTo: searchParams.get("issuedTo") ?? undefined,
      sortBy: parseSortField(searchParams.get("sortBy")),
      sortOrder,
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<InvoicesFilters>) => {
      const next: InvoicesFilters = { ...filters, ...patch };
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
