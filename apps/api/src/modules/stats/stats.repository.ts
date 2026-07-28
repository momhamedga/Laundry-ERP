import type { OrderStatus, Prisma, PrismaClient } from "@prisma/client";
import { TERMINAL_STATUSES } from "../orders/index.js";

/** صف مدفوعات مختزل لتجميع الإيراد */
export interface RevenueRow {
  createdAt: Date;
  amount: Prisma.Decimal;
  refundedAmount: Prisma.Decimal;
}

/**
 * Repository - استعلامات تجميعية للوحة التحكم
 * كل الدوال تقبل فلتر فرع اختيارياً
 */
export class StatsRepository {
  constructor(private readonly db: PrismaClient) {}

  private orderBranch(branchId?: string): Prisma.OrderWhereInput {
    return branchId ? { branchId } : {};
  }

  private paymentBranch(branchId?: string): Prisma.PaymentWhereInput {
    return branchId ? { order: { branchId } } : {};
  }

  countOrdersSince(since: Date, branchId?: string): Promise<number> {
    return this.db.order.count({
      where: { ...this.orderBranch(branchId), receivedAt: { gte: since } },
    });
  }

  countNewCustomersSince(since: Date): Promise<number> {
    return this.db.customer.count({ where: { createdAt: { gte: since } } });
  }

  countActiveOrders(branchId?: string): Promise<number> {
    return this.db.order.count({
      where: {
        ...this.orderBranch(branchId),
        status: { notIn: [...TERMINAL_STATUSES] },
      },
    });
  }

  countOrdersByStatus(status: OrderStatus, branchId?: string): Promise<number> {
    return this.db.order.count({
      where: { ...this.orderBranch(branchId), status },
    });
  }

  countOverdueOrders(now: Date, branchId?: string): Promise<number> {
    return this.db.order.count({
      where: {
        ...this.orderBranch(branchId),
        status: { notIn: [...TERMINAL_STATUSES] },
        dueDate: { lt: now },
      },
    });
  }

  /** المستحق = Σ(total - paidAmount) للطلبات غير الملغاة */
  async unpaidBalance(branchId?: string): Promise<Prisma.Decimal | null> {
    const agg = await this.db.order.aggregate({
      where: { ...this.orderBranch(branchId), status: { not: "CANCELLED" } },
      _sum: { total: true, paidAmount: true },
    });
    return agg._sum.total?.sub(agg._sum.paidAmount ?? 0) ?? null;
  }

  /** توزيع الطلبات على الحالات - groupBy واحد */
  async ordersByStatus(
    branchId?: string,
  ): Promise<{ status: OrderStatus; count: number }[]> {
    const rows = await this.db.order.groupBy({
      by: ["status"],
      where: this.orderBranch(branchId),
      _count: true,
    });
    return rows.map((r) => ({ status: r.status, count: r._count }));
  }

  /** مدفوعات فترة للتجميع اليومي بالخادم (COMPLETED/REFUNDED فقط) */
  findRevenueRowsSince(since: Date, branchId?: string): Promise<RevenueRow[]> {
    return this.db.payment.findMany({
      where: {
        ...this.paymentBranch(branchId),
        status: { in: ["COMPLETED", "REFUNDED"] },
        createdAt: { gte: since },
      },
      select: { createdAt: true, amount: true, refundedAmount: true },
    });
  }
}
