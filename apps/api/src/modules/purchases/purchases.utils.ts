import type { Prisma } from "@prisma/client";
import {
  PURCHASE_NUMBER_PREFIX,
  PURCHASE_NUMBER_SEQ_LENGTH,
} from "./purchases.constants.js";
import type { ListPurchasesQuery } from "./purchases.dto.js";
import type { PaginationMeta } from "./purchases.types.js";

export function toSkipTake(page: number, limit: number): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

export function purchaseNumberPrefixForYear(year: number): string {
  return `${PURCHASE_NUMBER_PREFIX}-${year}-`;
}

export function formatPurchaseNumber(year: number, sequence: number): string {
  return purchaseNumberPrefixForYear(year) + String(sequence).padStart(PURCHASE_NUMBER_SEQ_LENGTH, "0");
}

export function parseSequence(purchaseNumber: string, prefix: string): number {
  const seq = Number.parseInt(purchaseNumber.slice(prefix.length), 10);
  return Number.isNaN(seq) ? 0 : seq;
}

/** يحسب الإجماليات من البنود ونسبة الضريبة */
export function computeTotals(
  items: { quantity: number; unitCost: number }[],
  taxRate: number,
): { subtotal: number; tax: number; total: number } {
  const subtotal = Number(items.reduce((s, i) => s + i.quantity * i.unitCost, 0).toFixed(2));
  const tax = Number(((subtotal * taxRate) / 100).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));
  return { subtotal, tax, total };
}

export function buildPurchaseWhere(query: ListPurchasesQuery): Prisma.PurchaseWhereInput {
  const where: Prisma.PurchaseWhereInput = {};
  if (query.search !== undefined) {
    where.OR = [
      { purchaseNumber: { contains: query.search, mode: "insensitive" } },
      { supplier: { name: { contains: query.search, mode: "insensitive" } } },
    ];
  }
  if (query.status !== undefined) where.status = query.status;
  if (query.supplierId !== undefined) where.supplierId = query.supplierId;
  if (query.from !== undefined || query.to !== undefined) {
    where.createdAt = {
      ...(query.from !== undefined ? { gte: query.from } : {}),
      ...(query.to !== undefined ? { lte: query.to } : {}),
    };
  }
  return where;
}
