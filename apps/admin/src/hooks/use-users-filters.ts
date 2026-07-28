"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "@/constants/users";
import type { SortOrder, UserRole } from "@/types";
import type { ListUsersParams, UserSortField } from "@/types/user";

export type UsersFilters = ListUsersParams;

const SORTABLE_FIELDS: readonly UserSortField[] = ["createdAt", "name", "email", "role"];
const ROLES: readonly UserRole[] = ["ADMIN", "MANAGER", "CASHIER", "WORKER", "DELIVERY"];

function parseSortField(raw: string | null): UserSortField {
  return (SORTABLE_FIELDS as readonly string[]).includes(raw ?? "")
    ? (raw as UserSortField)
    : "createdAt";
}

function parseRole(raw: string | null): UserRole | undefined {
  return (ROLES as readonly string[]).includes(raw ?? "") ? (raw as UserRole) : undefined;
}

function parseIsActive(raw: string | null): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

/** حالة فلاتر قائمة المستخدمين مُشتقة من رابط الصفحة - بنفس نمط useCustomersFilters/useOrdersFilters */
export function useUsersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<UsersFilters>(() => {
    const page = Number(searchParams.get("page"));
    const limit = Number(searchParams.get("limit"));
    const sortOrder: SortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    return {
      page: Number.isFinite(page) && page > 0 ? page : DEFAULT_PAGE,
      limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
      search: searchParams.get("search") ?? undefined,
      role: parseRole(searchParams.get("role")),
      isActive: parseIsActive(searchParams.get("isActive")),
      sortBy: parseSortField(searchParams.get("sortBy")),
      sortOrder,
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<UsersFilters>) => {
      const next: UsersFilters = { ...filters, ...patch };
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
