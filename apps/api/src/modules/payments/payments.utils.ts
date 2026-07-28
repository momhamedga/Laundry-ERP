import { Prisma } from "@prisma/client";
import type { PaymentStatus } from "@prisma/client";
import type { ListPaymentsQuery } from "./payments.dto.js";
import type { PaginationMeta } from "./payments.types.js";

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

export const ZERO = new Prisma.Decimal(0);

export function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/**
 * Business Rule: حالة الدفع للطلب تُشتق تلقائياً من صافي المحصل
 * - PAID: المحصل غطى الإجمالي
 * - PARTIAL: محصل جزئي
 * - REFUNDED: لا محصل صافٍ لكن حدثت استردادات
 * - UNPAID: لا شيء
 */
export function deriveOrderPaymentStatus(
  total: Prisma.Decimal,
  paidNet: Prisma.Decimal,
  refundedSum: Prisma.Decimal,
): PaymentStatus {
  if (paidNet.gt(ZERO) && paidNet.gte(total)) return "PAID";
  if (paidNet.gt(ZERO)) return "PARTIAL";
  if (refundedSum.gt(ZERO)) return "REFUNDED";
  return "UNPAID";
}

// ==================== Query Builders ====================

export function buildPaymentWhere(query: ListPaymentsQuery): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = {};

  if (query.search !== undefined) {
    where.OR = [
      { reference: { contains: query.search, mode: "insensitive" } },
      { order: { orderNumber: { contains: query.search, mode: "insensitive" } } },
      { order: { customer: { name: { contains: query.search, mode: "insensitive" } } } },
    ];
  }
  if (query.orderId !== undefined) where.orderId = query.orderId;
  if (query.method !== undefined) where.method = query.method;
  if (query.status !== undefined) where.status = query.status;

  if (query.dateFrom !== undefined || query.dateTo !== undefined) {
    where.createdAt = {
      ...(query.dateFrom !== undefined ? { gte: query.dateFrom } : {}),
      ...(query.dateTo !== undefined ? { lte: query.dateTo } : {}),
    };
  }
  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    where.amount = {
      ...(query.minAmount !== undefined ? { gte: query.minAmount } : {}),
      ...(query.maxAmount !== undefined ? { lte: query.maxAmount } : {}),
    };
  }

  return where;
}

export function buildPaymentOrderBy(
  query: ListPaymentsQuery,
): Prisma.PaymentOrderByWithRelationInput {
  return { [query.sortBy]: query.sortOrder };
}
