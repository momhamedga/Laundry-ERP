import type { Prisma } from "@prisma/client";
import type { ListItemsQuery, ListMovementsQuery } from "./inventory.dto.js";
import type { PaginationMeta } from "./inventory.types.js";

export function toSkipTake(page: number, limit: number): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

export function buildItemWhere(query: ListItemsQuery): Prisma.InventoryItemWhereInput {
  const where: Prisma.InventoryItemWhereInput = {};
  if (query.search !== undefined) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { sku: { contains: query.search, mode: "insensitive" } },
      { category: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.type !== undefined) where.type = query.type;
  if (query.supplierId !== undefined) where.supplierId = query.supplierId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  // نقص المخزون: quantity <= reorderLevel يُرشَّح بالخدمة (Prisma لا يقارن عمودين مباشرة)
  return where;
}

export function buildItemOrderBy(
  query: ListItemsQuery,
): Prisma.InventoryItemOrderByWithRelationInput {
  return { [query.sortBy]: query.sortOrder };
}

export function buildMovementWhere(query: ListMovementsQuery): Prisma.InventoryTransactionWhereInput {
  const where: Prisma.InventoryTransactionWhereInput = {};
  if (query.itemId !== undefined) where.itemId = query.itemId;
  if (query.type !== undefined) where.type = query.type;
  if (query.from !== undefined || query.to !== undefined) {
    where.createdAt = {
      ...(query.from !== undefined ? { gte: query.from } : {}),
      ...(query.to !== undefined ? { lte: query.to } : {}),
    };
  }
  return where;
}
