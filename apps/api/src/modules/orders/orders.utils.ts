import { Prisma } from "@prisma/client";
import type { OrderStatus, PaymentStatus, Service } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { ListOrdersQuery, OrderItemDto } from "./orders.dto.js";
import {
  ORDER_NUMBER_PREFIX,
  ORDER_NUMBER_SEQ_LENGTH,
  ORDER_STATUS_FLOW,
  TERMINAL_STATUSES,
} from "./orders.constants.js";
import type { OrderTotals, PaginationMeta, PricedOrderItem } from "./orders.types.js";

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

// ==================== Order Number ====================

/** بادئة السنة الحالية: "ORD-2026-" */
export function orderNumberPrefixForYear(year: number): string {
  return `${ORDER_NUMBER_PREFIX}-${year}-`;
}

/** بناء رقم كامل من التسلسل: ORD-2026-000004 */
export function formatOrderNumber(year: number, sequence: number): string {
  return orderNumberPrefixForYear(year) + String(sequence).padStart(ORDER_NUMBER_SEQ_LENGTH, "0");
}

/** استخراج التسلسل من آخر رقم مستخدم */
export function parseSequence(orderNumber: string, prefix: string): number {
  const seq = Number.parseInt(orderNumber.slice(prefix.length), 10);
  return Number.isNaN(seq) ? 0 : seq;
}

// ==================== Lifecycle ====================

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Business Rule: لا رجوع لحالة سابقة - التقدم للأمام فقط
 * (القفز فوق مراحل مسموح، الإلغاء له مساره الخاص)
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (isTerminal(from)) return false;
  if (to === "CANCELLED") return true;
  const fromIdx = ORDER_STATUS_FLOW.indexOf(from);
  const toIdx = ORDER_STATUS_FLOW.indexOf(to);
  return fromIdx !== -1 && toIdx !== -1 && toIdx > fromIdx;
}

// ==================== Money (Server-side Only) ====================

/**
 * Business Rule: الإجماليات تُحسب من عناصر الطلب فقط - بالخادم حصراً
 * unitPrice يُقرأ snapshot من الخدمة، والحساب بـ Decimal لدقة مالية
 */
export function computeTotals(
  items: readonly OrderItemDto[],
  services: ReadonlyMap<string, Service>,
  orderDiscount: number,
): OrderTotals {
  const priced: PricedOrderItem[] = items.map((item, index) => {
    const service = services.get(item.serviceId);
    if (!service) {
      throw new ApiError(404, `الخدمة غير موجودة في البند رقم ${index + 1}.`);
    }

    const quantity = new Prisma.Decimal(item.quantity);
    const discount = new Prisma.Decimal(item.discount);
    const gross = service.price.mul(quantity);

    if (discount.gt(gross)) {
      throw new ApiError(
        400,
        `خصم البند رقم ${index + 1} يتجاوز قيمته (${gross.toFixed(2)}).`,
      );
    }

    return {
      serviceId: item.serviceId,
      quantity,
      unitPrice: service.price,
      discount,
      subtotal: gross.sub(discount),
      notes: item.notes ?? null,
    };
  });

  const subtotal = priced.reduce(
    (sum, item) => sum.add(item.subtotal),
    new Prisma.Decimal(0),
  );
  const discount = new Prisma.Decimal(orderDiscount);

  if (discount.gt(subtotal)) {
    throw new ApiError(400, `خصم الطلب يتجاوز المجموع الفرعي (${subtotal.toFixed(2)}).`);
  }

  return { subtotal, discount, total: subtotal.sub(discount), items: priced };
}

/** حالة الدفع تُشتق من المدفوع مقابل الإجمالي */
export function derivePaymentStatus(
  total: Prisma.Decimal,
  paidAmount: Prisma.Decimal,
): PaymentStatus {
  if (paidAmount.lte(0)) return "UNPAID";
  if (paidAmount.gte(total)) return "PAID";
  return "PARTIAL";
}

// ==================== Query Builders ====================

export function buildOrderWhere(query: ListOrdersQuery): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (query.search !== undefined) {
    where.OR = [
      { orderNumber: { contains: query.search, mode: "insensitive" } },
      { customer: { name: { contains: query.search, mode: "insensitive" } } },
      { customer: { phone: { contains: query.search } } },
    ];
  }
  if (query.status !== undefined) where.status = query.status;
  if (query.paymentStatus !== undefined) where.paymentStatus = query.paymentStatus;
  if (query.customerId !== undefined) where.customerId = query.customerId;
  if (query.branchId !== undefined) where.branchId = query.branchId;

  if (query.receivedFrom !== undefined || query.receivedTo !== undefined) {
    where.receivedAt = {
      ...(query.receivedFrom !== undefined ? { gte: query.receivedFrom } : {}),
      ...(query.receivedTo !== undefined ? { lte: query.receivedTo } : {}),
    };
  }

  // نطاق الاستحقاق — يُسند شاشة التسليمات بتصفية على الخادم بدل جلب كل الطلبات
  if (query.dueFrom !== undefined || query.dueTo !== undefined) {
    where.dueDate = {
      ...(query.dueFrom !== undefined ? { gte: query.dueFrom } : {}),
      ...(query.dueTo !== undefined ? { lte: query.dueTo } : {}),
    };
  }

  return where;
}

export function buildOrderOrderBy(
  query: ListOrdersQuery,
): Prisma.OrderOrderByWithRelationInput {
  return { [query.sortBy]: query.sortOrder };
}
