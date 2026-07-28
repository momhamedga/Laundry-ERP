"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "@/constants/customers";
import type { CustomerSortField, ListCustomersParams } from "@/types/customer";
import type { SortOrder } from "@/types";

export type CustomersFilters = ListCustomersParams;

const SORTABLE_FIELDS: readonly CustomerSortField[] = ["createdAt", "name", "phone"];

function parseSortField(raw: string | null): CustomerSortField {
  return (SORTABLE_FIELDS as readonly string[]).includes(raw ?? "")
    ? (raw as CustomerSortField)
    : "createdAt";
}

function parseIsActive(raw: string | null): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

/**
 * حالة فلاتر قائمة العملاء مُشتقة من رابط الصفحة - قابلة للمشاركة والتحديث
 * (Server Pagination/Search/Filters/Sorting كلها تُقرأ من query string)
 */
export function useCustomersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<CustomersFilters>(() => {
    const page = Number(searchParams.get("page"));
    const limit = Number(searchParams.get("limit"));
    const sortOrder: SortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    return {
      page: Number.isFinite(page) && page > 0 ? page : DEFAULT_PAGE,
      limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
      search: searchParams.get("search") ?? undefined,
      isActive: parseIsActive(searchParams.get("isActive")),
      createdFrom: searchParams.get("createdFrom") ?? undefined,
      createdTo: searchParams.get("createdTo") ?? undefined,
      sortBy: parseSortField(searchParams.get("sortBy")),
      sortOrder,
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<CustomersFilters>) => {
      const next: CustomersFilters = { ...filters, ...patch };
      // أي تغيير بخلاف رقم الصفحة نفسه يعيد الترقيم للصفحة الأولى
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
