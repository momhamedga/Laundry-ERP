import type { Customer, Prisma, PrismaClient } from "@prisma/client";
import {
  ACTIVE_ORDER_STATUSES,
  PROFILE_RECENT_ORDERS,
} from "./customers.constants.js";
import type { RecentOrder } from "./customers.types.js";

/** نتيجة الاستعلامات التجميعية الخام قبل التحويل */
export interface RawCustomerStats {
  totalOrders: number;
  activeOrders: number;
  financials: { total: Prisma.Decimal | null; paidAmount: Prisma.Decimal | null };
  lastOrderAt: Date | null;
}

const RECENT_ORDER_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  total: true,
  paidAmount: true,
  receivedAt: true,
  dueDate: true,
} as const;

/**
 * Repository Pattern - كل وصول لقاعدة البيانات الخاص بالعملاء
 */
export class CustomersRepository {
  constructor(private readonly db: PrismaClient) {}

  // ==================== Queries ====================

  /** قائمة + العدد الكلي في transaction واحدة */
  findManyWithCount(
    where: Prisma.CustomerWhereInput,
    orderBy: Prisma.CustomerOrderByWithRelationInput,
    skip: number,
    take: number,
  ): Promise<[Customer[], number]> {
    return this.db.$transaction([
      this.db.customer.findMany({ where, orderBy, skip, take }),
      this.db.customer.count({ where }),
    ]);
  }

  findById(id: string): Promise<Customer | null> {
    return this.db.customer.findUnique({ where: { id } });
  }

  /** بحث مباشر على الفهرس الفريد للهاتف */
  findByPhone(phone: string): Promise<Customer | null> {
    return this.db.customer.findUnique({ where: { phone } });
  }

  countOrders(customerId: string): Promise<number> {
    return this.db.order.count({ where: { customerId } });
  }

  // ==================== Mutations ====================

  create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    return this.db.customer.create({ data });
  }

  update(id: string, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    return this.db.customer.update({ where: { id }, data });
  }

  // ==================== Statistics (Live from DB) ====================

  /**
   * كل الإحصائيات في transaction واحدة - تُحسب من الطلبات مباشرة
   * المبالغ لا تشمل الطلبات الملغاة
   */
  async getStats(customerId: string): Promise<RawCustomerStats> {
    const [totalOrders, activeOrders, financials, lastOrder] =
      await this.db.$transaction([
        this.db.order.count({ where: { customerId } }),
        this.db.order.count({
          where: { customerId, status: { in: [...ACTIVE_ORDER_STATUSES] } },
        }),
        this.db.order.aggregate({
          where: { customerId, status: { not: "CANCELLED" } },
          _sum: { total: true, paidAmount: true },
        }),
        this.db.order.findFirst({
          where: { customerId },
          orderBy: { receivedAt: "desc" },
          select: { receivedAt: true },
        }),
      ]);

    return {
      totalOrders,
      activeOrders,
      financials: {
        total: financials._sum.total,
        paidAmount: financials._sum.paidAmount,
      },
      lastOrderAt: lastOrder?.receivedAt ?? null,
    };
  }

  /** آخر الطلبات للـ Profile */
  findRecentOrders(customerId: string): Promise<RecentOrder[]> {
    return this.db.order.findMany({
      where: { customerId },
      orderBy: { receivedAt: "desc" },
      take: PROFILE_RECENT_ORDERS,
      select: RECENT_ORDER_SELECT,
    });
  }
}
