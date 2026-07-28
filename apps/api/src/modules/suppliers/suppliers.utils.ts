import type { Prisma } from "@prisma/client";
import type { ListSuppliersQuery } from "./suppliers.dto.js";
import type { PaginationMeta } from "./suppliers.types.js";

export function toSkipTake(page: number, limit: number): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

export function buildSupplierWhere(query: ListSuppliersQuery): Prisma.SupplierWhereInput {
  const where: Prisma.SupplierWhereInput = {};
  if (query.search !== undefined) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { contactName: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.isActive !== undefined) where.isActive = query.isActive;
  return where;
}

export function buildSupplierOrderBy(
  query: ListSuppliersQuery,
): Prisma.SupplierOrderByWithRelationInput {
  return { [query.sortBy]: query.sortOrder };
}
