import { Prisma } from "@prisma/client";
import type { AuditAction, InvoiceStatus, Order, OrderItem, PrismaClient, Service } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import {
  INVOICE_NUMBER_MAX_RETRIES,
  INVOICE_NUMBER_PREFIX,
  INVOICE_NUMBER_SEQ_LENGTH,
} from "./invoice.constants.js";
import {
  INVOICE_DETAIL_INCLUDE,
  INVOICE_LIST_INCLUDE,
  type InvoiceDetail,
  type InvoiceItemSnapshot,
  type InvoiceListRow,
} from "./invoice.types.js";

/** الطلب مع بنوده وخدماتها - مصدر اللقطة (Snapshot) عند إصدار الفاتورة */
export type OrderForInvoice = Order & { items: (OrderItem & { service: Service })[] };

/** بيانات إنشاء الفاتورة بعد حساب الإجماليات بالخادم */
export interface CreateInvoiceData {
  orderId: string;
  customerId: string;
  branchId: string;
  createdById: string;
  status: InvoiceStatus;
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  tax: Prisma.Decimal;
  total: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  remainingAmount: Prisma.Decimal;
  dueDate: Date | null;
  notes: string | null;
  items: InvoiceItemSnapshot[];
}

/** بيانات تعديل الفاتورة */
export interface UpdateInvoiceData {
  status?: InvoiceStatus;
  tax?: Prisma.Decimal;
  total?: Prisma.Decimal;
  remainingAmount?: Prisma.Decimal;
  dueDate?: Date | null;
  notes?: string | null;
  updatedById: string;
}

// ==================== Invoice Number ====================

/** بادئة السنة الحالية: "INV-2026-" */
function invoiceNumberPrefixForYear(year: number): string {
  return `${INVOICE_NUMBER_PREFIX}-${year}-`;
}

/** بناء رقم كامل من التسلسل: INV-2026-000004 */
function formatInvoiceNumber(year: number, sequence: number): string {
  return invoiceNumberPrefixForYear(year) + String(sequence).padStart(INVOICE_NUMBER_SEQ_LENGTH, "0");
}

/** استخراج التسلسل من آخر رقم مستخدم */
function parseSequence(invoiceNumber: string, prefix: string): number {
  const seq = Number.parseInt(invoiceNumber.slice(prefix.length), 10);
  return Number.isNaN(seq) ? 0 : seq;
}

function toItemCreateInput(
  items: InvoiceItemSnapshot[],
): Prisma.InvoiceItemUncheckedCreateWithoutInvoiceInput[] {
  return items.map((i) => ({
    serviceId: i.serviceId,
    serviceNameSnapshot: i.serviceNameSnapshot,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    total: i.total,
  }));
}

/**
 * Repository Pattern - كل وصول لقاعدة البيانات الخاص بالفواتير
 * العمليات المركبة (إنشاء/تعديل + تدقيق) ذرية داخل Prisma Transactions،
 * بنفس نمط orders.repository.ts/payments.repository.ts
 */
export class InvoicesRepository {
  constructor(private readonly db: PrismaClient) {}

  // ==================== Queries ====================

  findManyWithCount(
    where: Prisma.InvoiceWhereInput,
    orderBy: Prisma.InvoiceOrderByWithRelationInput,
    skip: number,
    take: number,
  ): Promise<[InvoiceListRow[], number]> {
    return this.db.$transaction([
      this.db.invoice.findMany({ where, orderBy, skip, take, include: INVOICE_LIST_INCLUDE }),
      this.db.invoice.count({ where }),
    ]);
  }

  findById(id: string): Promise<InvoiceDetail | null> {
    return this.db.invoice.findUnique({ where: { id }, include: INVOICE_DETAIL_INCLUDE });
  }

  findByNumber(invoiceNumber: string): Promise<InvoiceDetail | null> {
    return this.db.invoice.findUnique({ where: { invoiceNumber }, include: INVOICE_DETAIL_INCLUDE });
  }

  findByOrderId(orderId: string): Promise<InvoiceDetail | null> {
    return this.db.invoice.findUnique({ where: { orderId }, include: INVOICE_DETAIL_INCLUDE });
  }

  // ==================== Reference Lookups ====================

  findOrderForInvoice(orderId: string): Promise<OrderForInvoice | null> {
    return this.db.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { service: true } } },
    });
  }

  // ==================== Create (Atomic) ====================

  /**
   * إنشاء الفاتورة + بنودها في Transaction واحدة
   * توليد الرقم داخل الـ transaction مع إعادة محاولة عند التصادم
   * (القيد الفريد على invoiceNumber هو خط الدفاع الأخير - بنفس نمط orders)
   */
  async createInvoiceWithItems(data: CreateInvoiceData): Promise<InvoiceDetail> {
    const year = new Date().getFullYear();
    const prefix = invoiceNumberPrefixForYear(year);

    for (let attempt = 1; attempt <= INVOICE_NUMBER_MAX_RETRIES; attempt++) {
      try {
        return await this.db.$transaction(async (tx) => {
          // تسلسل تخصيص رقم الفاتورة لهذه السنة عبر قفل استشاري (يُحرَّر بنهاية
          // المعاملة): يمنع تصادم القيد الفريد تحت التزامن نهائياً - نفس نمط orders.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('invoice_number')::int, ${year}::int)`;

          const last = await tx.invoice.findFirst({
            where: { invoiceNumber: { startsWith: prefix } },
            orderBy: { invoiceNumber: "desc" },
            select: { invoiceNumber: true },
          });
          const sequence = last ? parseSequence(last.invoiceNumber, prefix) + 1 : 1;

          const invoice = await tx.invoice.create({
            data: {
              invoiceNumber: formatInvoiceNumber(year, sequence),
              status: data.status,
              orderId: data.orderId,
              customerId: data.customerId,
              branchId: data.branchId,
              createdById: data.createdById,
              subtotal: data.subtotal,
              discount: data.discount,
              tax: data.tax,
              total: data.total,
              paidAmount: data.paidAmount,
              remainingAmount: data.remainingAmount,
              dueDate: data.dueDate,
              notes: data.notes,
              items: { create: toItemCreateInput(data.items) },
            },
            include: INVOICE_DETAIL_INCLUDE,
          });

          await tx.auditLog.create({
            data: {
              action: "INVOICE_CREATED" as AuditAction,
              userId: data.createdById,
              metadata: {
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                orderId: data.orderId,
                total: data.total.toNumber(),
              },
            },
          });

          return invoice;
        });
      } catch (err) {
        const isCollision =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
        if (!isCollision || attempt === INVOICE_NUMBER_MAX_RETRIES) throw err;
      }
    }
    throw new ApiError(409, "تعذّر حجز رقم فاتورة. أعد المحاولة.");
  }

  // ==================== Update (Atomic) ====================

  async updateInvoice(
    id: string,
    data: UpdateInvoiceData,
    auditAction: AuditAction,
    metadata: Prisma.InputJsonValue,
  ): Promise<InvoiceDetail> {
    return this.db.$transaction(async (tx) => {
      const invoice = await tx.invoice.update({
        where: { id },
        data: {
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.tax !== undefined ? { tax: data.tax } : {}),
          ...(data.total !== undefined ? { total: data.total } : {}),
          ...(data.remainingAmount !== undefined
            ? { remainingAmount: data.remainingAmount }
            : {}),
          ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          updatedById: data.updatedById,
        },
        include: INVOICE_DETAIL_INCLUDE,
      });

      await tx.auditLog.create({
        data: { action: auditAction, userId: data.updatedById, metadata },
      });

      return invoice;
    });
  }

  // ==================== Delete (Atomic) ====================

  async deleteInvoice(id: string, deletedById: string, metadata: Prisma.InputJsonValue): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.invoice.delete({ where: { id } });
      await tx.auditLog.create({
        data: { action: "INVOICE_DELETED" as AuditAction, userId: deletedById, metadata },
      });
    });
  }

  // ==================== Payments Integration (Atomic) ====================

  /** تشغيل عملية ذرية على عميل transaction خام - يُشارَك مع PaymentsTxRepository */
  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.db.$transaction(async (tx) => fn(tx));
  }

  /** تحميل الحقول اللازمة لاشتقاق حالة الدفع داخل transaction */
  findPaymentStateFieldsTx(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<{ id: string; total: Prisma.Decimal; status: InvoiceStatus; orderId: string } | null> {
    return tx.invoice.findUnique({
      where: { id },
      select: { id: true, total: true, status: true, orderId: true },
    });
  }

  /** تحديث كاش حالة الدفع بالفاتورة داخل transaction (Business Rule: مع كل دفعة) */
  updateInvoicePaymentStateTx(
    tx: Prisma.TransactionClient,
    id: string,
    paidAmount: Prisma.Decimal,
    remainingAmount: Prisma.Decimal,
    status: InvoiceStatus,
  ): Promise<unknown> {
    return tx.invoice.update({
      where: { id },
      data: { paidAmount, remainingAmount, status },
    });
  }

  // ==================== Documents (Print/PDF/Email) ====================

  /**
   * تدقيق مستقل (بلا Transaction) لعمليات المستندات (طباعة/تنزيل/بريد) -
   * يشمل ipAddress/userAgent خلافاً لتدقيقات Phase 1 الداخلية (لم تُعدَّل، راجع التقرير)
   */
  createDocumentAudit(entry: {
    action: AuditAction;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Prisma.InputJsonValue;
  }): Promise<unknown> {
    return this.db.auditLog.create({
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
