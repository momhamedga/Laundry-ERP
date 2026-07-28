import type { Prisma } from "@prisma/client";
import type { ListCustomersQuery } from "./customers.dto.js";
import type { PaginationMeta } from "./customers.types.js";

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

// ==================== Money ====================

/** تحويل Prisma Decimal (أو null) إلى رقم للاستجابات */
export function decimalToNumber(value: Prisma.Decimal | null): number {
  return value === null ? 0 : Number(value);
}

// ==================== Query Builders ====================

/** بناء شروط Prisma - البحث في الاسم/الهاتف/البريد */
export function buildCustomerWhere(query: ListCustomersQuery): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {};

  if (query.search !== undefined) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.isActive !== undefined) where.isActive = query.isActive;

  if (query.createdFrom !== undefined || query.createdTo !== undefined) {
    where.createdAt = {
      ...(query.createdFrom !== undefined ? { gte: query.createdFrom } : {}),
      ...(query.createdTo !== undefined ? { lte: query.createdTo } : {}),
    };
  }

  return where;
}

export function buildCustomerOrderBy(
  query: ListCustomersQuery,
): Prisma.CustomerOrderByWithRelationInput {
  return { [query.sortBy]: query.sortOrder };
}
