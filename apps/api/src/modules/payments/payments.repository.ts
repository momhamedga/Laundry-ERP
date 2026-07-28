import { Prisma } from "@prisma/client";
import type {
  AuditAction,
  Order,
  Payment,
  PaymentStatus,
  PrismaClient,
} from "@prisma/client";
import { PAYMENT_INCLUDE, type OrderPaymentSums, type PaymentRow } from "./payments.types.js";
import { ZERO } from "./payments.utils.js";

/**
 * Repository داخل نطاق Transaction - كل عملية دفع مركبة
 * (تحقق سقف + كتابة + إعادة حساب الطلب + تدقيق) تجري ذرياً
 */
export class PaymentsTxRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  findOrderById(id: string): Promise<Order | null> {
    return this.tx.order.findUnique({ where: { id } });
  }

  findPaymentById(id: string): Promise<PaymentRow | null> {
    return this.tx.payment.findUnique({ where: { id }, include: PAYMENT_INCLUDE });
  }

  /**
   * مجاميع مدفوعات الطلب - داخل الـ transaction لضمان الاتساق
   * (استعلامات متتالية: عميل الـ transaction لا يدعم التوازي)
   */
  async getOrderPaymentSums(orderId: string): Promise<OrderPaymentSums> {
    const counted = await this.tx.payment.aggregate({
      where: { orderId, status: { in: ["COMPLETED", "REFUNDED"] } },
      _sum: { amount: true, refundedAmount: true },
    });
    const pending = await this.tx.payment.aggregate({
      where: { orderId, status: "PENDING" },
      _sum: { amount: true },
    });

    const gross = counted._sum.amount ?? ZERO;
    const refundedSum = counted._sum.refundedAmount ?? ZERO;

    return {
      paidNet: gross.sub(refundedSum),
      pendingSum: pending._sum.amount ?? ZERO,
      refundedSum,
    };
  }

  createPayment(data: Prisma.PaymentUncheckedCreateInput): Promise<Payment> {
    return this.tx.payment.create({ data });
  }

  updatePayment(id: string, data: Prisma.PaymentUncheckedUpdateInput): Promise<Payment> {
    return this.tx.payment.update({ where: { id }, data });
  }

  /** تحديث حالة الدفع للطلب - Business Rule: تلقائي دائماً */
  updateOrderPaymentState(
    orderId: string,
    paidAmount: Prisma.Decimal,
    paymentStatus: PaymentStatus,
  ): Promise<Order> {
    return this.tx.order.update({
      where: { id: orderId },
      data: { paidAmount, paymentStatus },
    });
  }

  /** Business Rule: جميع العمليات تُسجل في Audit Log */
  createAudit(entry: {
    action: AuditAction;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Prisma.InputJsonValue;
  }): Promise<unknown> {
    return this.tx.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        metadata: entry.metadata,
      },
    });
  }
}

/**
 * Repository Pattern - القراءات خارج الـ transactions،
 * والتحويلات المالية عبر transaction() حصراً
 */
export class PaymentsRepository {
  constructor(private readonly db: PrismaClient) {}

  /** تنفيذ عملية مالية ذرية - قواعد العمل تُمرر من الـ Service */
  transaction<T>(fn: (repo: PaymentsTxRepository) => Promise<T>): Promise<T> {
    return this.db.$transaction(async (tx) => fn(new PaymentsTxRepository(tx)));
  }

  /** قائمة + العدد في transaction واحدة - include يمنع N+1 */
  findManyWithCount(
    where: Prisma.PaymentWhereInput,
    orderBy: Prisma.PaymentOrderByWithRelationInput,
    skip: number,
    take: number,
  ): Promise<[PaymentRow[], number]> {
    return this.db.$transaction([
      this.db.payment.findMany({ where, orderBy, skip, take, include: PAYMENT_INCLUDE }),
      this.db.payment.count({ where }),
    ]);
  }

  findById(id: string): Promise<PaymentRow | null> {
    return this.db.payment.findUnique({ where: { id }, include: PAYMENT_INCLUDE });
  }

  /**
   * صافي المحصَّل لطلب واحد (خارج transaction) - نفس قاعدة getOrderPaymentSums:
   * COMPLETED+REFUNDED، (المبلغ − المسترد). للقراءة الحية لحالة دفع الفاتورة.
   */
  async getOrderPaidNet(orderId: string): Promise<Prisma.Decimal> {
    const agg = await this.db.payment.aggregate({
      where: { orderId, status: { in: ["COMPLETED", "REFUNDED"] } },
      _sum: { amount: true, refundedAmount: true },
    });
    const gross = agg._sum.amount ?? ZERO;
    const refunded = agg._sum.refundedAmount ?? ZERO;
    return gross.sub(refunded);
  }

  /**
   * صافي المحصَّل لعدة طلبات دفعة واحدة (groupBy) - يتفادى N+1 عند اشتقاق
   * حالة دفع قائمة الفواتير حيّاً. يُعيد Map<orderId, net>؛ الطلبات بلا مدفوعات
   * لا تظهر بالخريطة (المستدعي يعاملها كصفر).
   */
  async getOrderPaidNetBatch(orderIds: readonly string[]): Promise<Map<string, Prisma.Decimal>> {
    const result = new Map<string, Prisma.Decimal>();
    if (orderIds.length === 0) return result;

    const grouped = await this.db.payment.groupBy({
      by: ["orderId"],
      where: { orderId: { in: [...orderIds] }, status: { in: ["COMPLETED", "REFUNDED"] } },
      _sum: { amount: true, refundedAmount: true },
    });

    for (const row of grouped) {
      const gross = row._sum.amount ?? ZERO;
      const refunded = row._sum.refundedAmount ?? ZERO;
      result.set(row.orderId, gross.sub(refunded));
    }
    return result;
  }
}
