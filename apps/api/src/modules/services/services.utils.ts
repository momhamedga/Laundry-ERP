import type { Prisma, Service } from "@prisma/client";
import type { ListServicesQuery } from "./services.dto.js";
import type {
  PaginationMeta,
  ServiceCategorySummary,
  ServiceWithCategory,
} from "./services.types.js";

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

/** بناء شروط Prisma - بحث في الاسم/الوصف + فلاتر */
export function buildServiceWhere(query: ListServicesQuery): Prisma.ServiceWhereInput {
  const where: Prisma.ServiceWhereInput = {};

  if (query.search !== undefined) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.categoryId !== undefined) where.categoryId = query.categoryId;
  if (query.unit !== undefined) where.unit = query.unit;
  if (query.isActive !== undefined) where.isActive = query.isActive;

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    };
  }

  return where;
}

export function buildServiceOrderBy(
  query: ListServicesQuery,
): Prisma.ServiceOrderByWithRelationInput {
  return { [query.sortBy]: query.sortOrder };
}

// ==================== Mapping ====================

/** إلحاق حالة الإتاحة المحسوبة: متاحة = الخدمة نشطة والتصنيف نشط */
export function toServiceWithCategory(
  service: Service & { category: ServiceCategorySummary },
): ServiceWithCategory {
  return { ...service, available: service.isActive && service.category.isActive };
}
