import type { Prisma, ServiceCategory } from "@prisma/client";
import type { ListCategoriesQuery } from "./category.dto.js";
import type { CategoryWithCount, PaginationMeta } from "./category.types.js";

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

export function buildCategoryWhere(
  query: ListCategoriesQuery,
): Prisma.ServiceCategoryWhereInput {
  const where: Prisma.ServiceCategoryWhereInput = {};

  if (query.search !== undefined) {
    where.name = { contains: query.search, mode: "insensitive" };
  }
  if (query.isActive !== undefined) where.isActive = query.isActive;

  return where;
}

export function buildCategoryOrderBy(
  query: ListCategoriesQuery,
): Prisma.ServiceCategoryOrderByWithRelationInput {
  return { [query.sortBy]: query.sortOrder };
}

// ==================== Mapping ====================

/** تحويل نتيجة Prisma مع _count إلى الشكل العام */
export function toCategoryWithCount(
  category: ServiceCategory & { _count: { services: number } },
): CategoryWithCount {
  const { _count, ...rest } = category;
  return { ...rest, servicesCount: _count.services };
}
