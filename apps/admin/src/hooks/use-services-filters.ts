"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "@/constants/services";
import type { SortOrder } from "@/types";
import type { ListServicesParams, ServiceSortField, ServiceUnit } from "@/types/service";

export type ServicesFilters = ListServicesParams;

const SORTABLE_FIELDS: readonly ServiceSortField[] = ["sortOrder", "name", "price", "createdAt"];
const UNITS: readonly ServiceUnit[] = ["PIECE", "KG", "FIXED"];

function parseSortField(raw: string | null): ServiceSortField {
  return (SORTABLE_FIELDS as readonly string[]).includes(raw ?? "")
    ? (raw as ServiceSortField)
    : "sortOrder";
}

function parseIsActive(raw: string | null): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

function parseUnit(raw: string | null): ServiceUnit | undefined {
  return (UNITS as readonly string[]).includes(raw ?? "") ? (raw as ServiceUnit) : undefined;
}

function parseNumber(raw: string | null): number | undefined {
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** حالة فلاتر قائمة الخدمات مُشتقة من رابط الصفحة */
export function useServicesFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<ServicesFilters>(() => {
    const page = Number(searchParams.get("page"));
    const limit = Number(searchParams.get("limit"));
    const sortOrder: SortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

    return {
      page: Number.isFinite(page) && page > 0 ? page : DEFAULT_PAGE,
      limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
      search: searchParams.get("search") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      unit: parseUnit(searchParams.get("unit")),
      isActive: parseIsActive(searchParams.get("isActive")),
      minPrice: parseNumber(searchParams.get("minPrice")),
      maxPrice: parseNumber(searchParams.get("maxPrice")),
      sortBy: parseSortField(searchParams.get("sortBy")),
      sortOrder,
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<ServicesFilters>) => {
      const next: ServicesFilters = { ...filters, ...patch };
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
