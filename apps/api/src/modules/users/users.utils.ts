import type { Prisma } from "@prisma/client";
import type { ListUsersQuery } from "./users.dto.js";
import type { PaginationMeta } from "./users.types.js";

// ==================== Pagination Helper ====================

export function toSkipTake(page: number, limit: number): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ==================== Query Builders ====================

/** بناء شروط Prisma من الفلاتر والبحث - Search على الاسم/البريد/الهاتف */
export function buildUserWhere(query: ListUsersQuery): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (query.search !== undefined) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search } },
    ];
  }
  if (query.role !== undefined) where.role = query.role;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.branchId !== undefined) where.branchId = query.branchId;

  return where;
}

export function buildUserOrderBy(
  query: ListUsersQuery,
): Prisma.UserOrderByWithRelationInput {
  return { [query.sortBy]: query.sortOrder };
}
