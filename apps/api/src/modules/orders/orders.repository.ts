import { Prisma } from "@prisma/client";
import type {
  Branch,
  Customer,
  OrderStatus,
  PaymentStatus,
  PrismaClient,
  Service,
} from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import { ORDER_NUMBER_MAX_RETRIES } from "./orders.constants.js";
import {
  formatOrderNumber,
  orderNumberPrefixForYear,
  parseSequence,
} from "./orders.utils.js";
import {
  HISTORY_INCLUDE,
  ORDER_DETAIL_INCLUDE,
  ORDER_LIST_INCLUDE,
  type HistoryEntry,
  type OrderDetail,
  type OrderListRow,
  type PricedOrderItem,
} from "./orders.types.js";

/** بيانات إنشاء الطلب بعد حساب الإجماليات بالخادم */
export interface CreateOrderData {
  customerId: string;
  branchId: string;
  createdById: string;
  receivedAt: Date;
  dueDate: Date;
  notes: string | null;
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  total: Prisma.Decimal;
  items: PricedOrderItem[];
}

/** بيانات تعديل الطلب - العناصر اختيارية (استبدال كامل عند وجودها) */
export interface UpdateOrderData {
  dueDate?: Date;
  notes?: string | null;
  subtotal?: Prisma.Decimal;
  discount?: Prisma.Decimal;
  total?: Prisma.Decimal;
  paymentStatus?: PaymentStatus;
  items?: PricedOrderItem[];
}

function toItemCreateInput(
  items: PricedOrderItem[],
): Prisma.OrderItemUncheckedCreateWithoutOrderInput[] {
  return items.map((i) => ({
    serviceId: i.serviceId,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    discount: i.discount,
    subtotal: i.subtotal,
    notes: i.notes,
  }));
}

/**
 * Repository Pattern - كل وصول لقاعدة البيانات الخاص بالطلبات
 * العمليات المركبة ذرية داخل Prisma Transactions
 */
export class OrdersRepository {
  constructor(private readonly db: PrismaClient) {}

  // ==================== Queries ====================

  /** قائمة + العدد في transaction واحدة - include يمنع N+1 */
  findManyWithCount(
    where: Prisma.OrderWhereInput,
    orderBy: Prisma.OrderOrderByWithRelationInput,
    skip: number,
    take: number,
  ): Promise<[OrderListRow[], number]> {
    return this.db.$transaction([
      this.db.order.findMany({ where, orderBy, skip, take, include: ORDER_LIST_INCLUDE }),
      this.db.order.count({ where }),
    ]);
  }

  findById(id: string): Promise<OrderDetail | null> {
    return this.db.order.findUnique({ where: { id }, include: ORDER_DETAIL_INCLUDE });
  }

  findByNumber(orderNumber: string): Promise<OrderDetail | null> {
    return this.db.order.findUnique({
      where: { orderNumber },
      include: ORDER_DETAIL_INCLUDE,
    });
  }

  findHistory(orderId: string): Promise<HistoryEntry[]> {
    return this.db.orderStatusHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
      include: HISTORY_INCLUDE,
    });
  }

  // ==================== Reference Lookups ====================

  findCustomerById(id: string): Promise<Customer | null> {
    return this.db.customer.findUnique({ where: { id } });
  }

  findBranchById(id: string): Promise<Branch | null> {
    return this.db.branch.findUnique({ where: { id } });
  }

  /** جلب كل خدمات الطلب مع تصنيفاتها بضربة واحدة - لا N+1 */
  findServicesWithCategory(
    ids: readonly string[],
  ): Promise<(Service & { category: { id: string; name: string; isActive: boolean } })[]> {
    return this.db.service.findMany({
      where: { id: { in: [...ids] } },
      include: { category: { select: { id: true, name: true, isActive: true } } },
    });
  }

  // ==================== Create (Atomic) ====================

  /**
   * إنشاء الطلب + عناصره + أول سجل حالة في Transaction واحدة.
   *
   * تخصيص الرقم مؤمَّن ضد التزامن عبر قفل استشاري على مستوى المعاملة
   * (pg_advisory_xact_lock) يُسلسِل قسم "اقرأ الأخير + 1 + أدرِج" لكل سنة، فيمنع
   * تصادم القيد الفريد نهائياً تحت الضغط - لا Race، لا Lost Update، لا فشل طلب.
   * القفل يُحرَّر تلقائياً بنهاية المعاملة (commit/rollback). حلقة إعادة المحاولة
   * تبقى خط دفاع أخير (القيد الفريد على orderNumber). لا يتغيّر شكل الرقم ولا أي API.
   */
  async createOrderWithItems(data: CreateOrderData): Promise<OrderDetail> {
    const year = data.receivedAt.getFullYear();
    const prefix = orderNumberPrefixForYear(year);

    for (let attempt = 1; attempt <= ORDER_NUMBER_MAX_RETRIES; attempt++) {
      try {
        return await this.db.$transaction(async (tx) => {
          // تسلسل تخصيص الرقم لهذه السنة عبر قفل استشاري (يُحرَّر بنهاية المعاملة)
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('order_number')::int, ${year}::int)`;

          const last = await tx.order.findFirst({
            where: { orderNumber: { startsWith: prefix } },
            orderBy: { orderNumber: "desc" },
            select: { orderNumber: true },
          });
          const sequence = last ? parseSequence(last.orderNumber, prefix) + 1 : 1;

          return tx.order.create({
            data: {
              orderNumber: formatOrderNumber(year, sequence),
              customerId: data.customerId,
              branchId: data.branchId,
              createdById: data.createdById,
              receivedAt: data.receivedAt,
              dueDate: data.dueDate,
              notes: data.notes,
              subtotal: data.subtotal,
              discount: data.discount,
              total: data.total,
              items: { create: toItemCreateInput(data.items) },
              statusHistory: {
                create: {
                  oldStatus: null,
                  newStatus: "RECEIVED",
                  changedById: data.createdById,
                  notes: "Order created",
                },
              },
            },
            include: ORDER_DETAIL_INCLUDE,
          });
        });
      } catch (err) {
        const isCollision =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
        if (!isCollision || attempt === ORDER_NUMBER_MAX_RETRIES) throw err;
      }
    }
    throw new ApiError(409, "تعذّر حجز رقم طلب. أعد المحاولة.");
  }

  // ==================== Update (Atomic) ====================

  /** تعديل الطلب - استبدال العناصر والإجماليات في Transaction واحدة */
  updateOrderWithItems(orderId: string, data: UpdateOrderData): Promise<OrderDetail> {
    return this.db.$transaction(async (tx) => {
      if (data.items) {
        await tx.orderItem.deleteMany({ where: { orderId } });
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          ...(data.subtotal !== undefined ? { subtotal: data.subtotal } : {}),
          ...(data.discount !== undefined ? { discount: data.discount } : {}),
          ...(data.total !== undefined ? { total: data.total } : {}),
          ...(data.paymentStatus !== undefined
            ? { paymentStatus: data.paymentStatus }
            : {}),
          ...(data.items ? { items: { create: toItemCreateInput(data.items) } } : {}),
        },
        include: ORDER_DETAIL_INCLUDE,
      });
    });
  }

  // ==================== Status Change (Atomic) ====================

  /** تغيير الحالة + سجل التاريخ في عملية ذرية واحدة (nested write) */
  changeStatus(
    orderId: string,
    oldStatus: OrderStatus,
    newStatus: OrderStatus,
    changedById: string,
    notes: string | null,
    deliveredAt?: Date,
  ): Promise<OrderDetail> {
    return this.db.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        ...(deliveredAt !== undefined ? { deliveredAt } : {}),
        statusHistory: {
          create: { oldStatus, newStatus, changedById, notes },
        },
      },
      include: ORDER_DETAIL_INCLUDE,
    });
  }
}
