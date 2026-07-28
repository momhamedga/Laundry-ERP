import type { Branch, Prisma } from "@prisma/client";
import type { ListBranchesQuery } from "./branches.dto.js";
import type { BranchWithCounts, PaginationMeta } from "./branches.types.js";

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

export function buildBranchWhere(query: ListBranchesQuery): Prisma.BranchWhereInput {
  const where: Prisma.BranchWhereInput = {};

  if (query.search !== undefined) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { address: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search } },
    ];
  }
  if (query.isActive !== undefined) where.isActive = query.isActive;

  return where;
}

export function buildBranchOrderBy(
  query: ListBranchesQuery,
): Prisma.BranchOrderByWithRelationInput {
  return { [query.sortBy]: query.sortOrder };
}

// ==================== Mapping ====================

export function toBranchWithCounts(
  branch: Branch & { _count: { users: number; orders: number } },
): BranchWithCounts {
  const { _count, ...rest } = branch;
  return { ...rest, usersCount: _count.users, ordersCount: _count.orders };
}
