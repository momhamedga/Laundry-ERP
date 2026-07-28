"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "@/constants/service-categories";
import type { SortOrder } from "@/types";
import type { CategorySortField, ListCategoriesParams } from "@/types/service-category";

export type CategoriesFilters = ListCategoriesParams;

const SORTABLE_FIELDS: readonly CategorySortField[] = ["sortOrder", "name", "createdAt"];

function parseSortField(raw: string | null): CategorySortField {
  return (SORTABLE_FIELDS as readonly string[]).includes(raw ?? "")
    ? (raw as CategorySortField)
    : "sortOrder";
}

function parseIsActive(raw: string | null): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

/** حالة فلاتر قائمة التصنيفات مُشتقة من رابط الصفحة */
export function useCategoriesFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<CategoriesFilters>(() => {
    const page = Number(searchParams.get("page"));
    const limit = Number(searchParams.get("limit"));
    const sortOrder: SortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

    return {
      page: Number.isFinite(page) && page > 0 ? page : DEFAULT_PAGE,
      limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
      search: searchParams.get("search") ?? undefined,
      isActive: parseIsActive(searchParams.get("isActive")),
      sortBy: parseSortField(searchParams.get("sortBy")),
      sortOrder,
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<CategoriesFilters>) => {
      const next: CategoriesFilters = { ...filters, ...patch };
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
