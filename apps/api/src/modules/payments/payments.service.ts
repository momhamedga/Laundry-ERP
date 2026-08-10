import { PAYMENT_STATUS_AR } from "../../constants/status-labels.js";
import { ApiError } from "../../middlewares/error.middleware.js";
import { renderHtmlToPdf } from "../../lib/pdf.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { RequestContext } from "../auth/auth.types.js";
import { notificationBus } from "../notifications/index.js";
import type { SettingsRepository } from "../settings/index.js";
import { ALLOW_COMPLETED_PAYMENT_EDIT } from "./payments.constants.js";
import type {
  CancelPaymentDto,
  CreatePaymentDto,
  ListPaymentsQuery,
  RefundPaymentDto,
  UpdatePaymentDto,
} from "./payments.dto.js";
import { buildPaymentReceiptHtml } from "./payment-receipt.template.js";
import type {
  PaymentsRepository,
  PaymentsTxRepository,
} from "./payments.repository.js";
import type { ListPaymentsResult, PaymentRow } from "./payments.types.js";
import {
  buildPaginationMeta,
  buildPaymentOrderBy,
  buildPaymentWhere,
  deriveOrderPaymentStatus,
  toDecimal,
  toSkipTake,
} from "./payments.utils.js";

export class PaymentsService {
  constructor(
    private readonly repo: PaymentsRepository,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  // ==================== Shared (in-transaction) ====================

  /**
   * Business Rule: عند أي تغيير يُعاد حساب رصيد الطلب وحالة
   * دفعه تلقائياً من المدفوعات - داخل نفس الـ Transaction
   */
  private async recomputeOrder(t: PaymentsTxRepository, orderId: string): Promise<void> {
    const order = await t.findOrderById(orderId);
    if (!order) throw new ApiError(404, "الطلب غير موجود.");

    const sums = await t.getOrderPaymentSums(orderId);
    await t.updateOrderPaymentState(
      orderId,
      sums.paidNet,
      deriveOrderPaymentStatus(order.total, sums.paidNet, sums.refundedSum),
    );
  }

  private async getPaymentOrFail(
    t: PaymentsTxRepository,
    id: string,
  ): Promise<PaymentRow> {
    const payment = await t.findPaymentById(id);
    if (!payment) throw new ApiError(404, "الدفعة غير موجودة.");
    return payment;
  }

  // ==================== Create ====================

  async create(
    dto: CreatePaymentDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<PaymentRow> {
    const payment = await this.repo.transaction(async (t) => {
      // Business Rule: لا دفعة لطلب غير موجود
      const order = await t.findOrderById(dto.orderId);
      if (!order) throw new ApiError(404, "الطلب غير موجود.");

      // Business Rule: لا دفعة لطلب ملغي
      if (order.status === "CANCELLED") {
        throw new ApiError(400, "لا يمكن تسجيل دفعة على طلب ملغي.");
      }

      // Business Rule: مجموع المدفوعات (محصل + معلق) لا يتجاوز إجمالي الطلب
      const sums = await t.getOrderPaymentSums(dto.orderId);
      const amount = toDecimal(dto.amount);
      const committed = sums.paidNet.add(sums.pendingSum).add(amount);
      if (committed.gt(order.total)) {
        throw new ApiError(
          400,
          `المبلغ يتجاوز إجمالي الطلب: ${committed.toFixed(2)} مقابل ${order.total.toFixed(2)}.`,
        );
      }

      const created = await t.createPayment({
        orderId: dto.orderId,
        amount,
        method: dto.method,
        status: dto.status,
        reference: dto.reference ?? null,
        notes: dto.notes ?? null,
        receivedById: actor.id,
      });

      await this.recomputeOrder(t, dto.orderId);
      await t.createAudit({
        action: "PAYMENT_CREATED",
        userId: actor.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: {
          paymentId: created.id,
          orderId: dto.orderId,
          amount: dto.amount,
          method: dto.method,
          status: dto.status,
        },
      });

      return this.getPaymentOrFail(t, created.id); // بحالة الطلب المحدثة
    });

    // الإشعار بعد نجاح الـ Transaction بالكامل فقط - لا نُبلِّغ عن دفعة قد تُلغى بالـ rollback
    notificationBus.emitNotification({
      type: "PAYMENT_RECEIVED",
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
        orderNumber: payment.order.orderNumber,
        amount: payment.amount.toNumber(),
        method: payment.method,
        receivedByName: payment.receivedBy.name,
      },
    });

    return payment;
  }

  // ==================== Read ====================

  async list(query: ListPaymentsQuery): Promise<ListPaymentsResult> {
    if (
      query.minAmount !== undefined &&
      query.maxAmount !== undefined &&
      query.minAmount > query.maxAmount
    ) {
      throw new ApiError(400, "الحد الأدنى للمبلغ لا يمكن أن يتجاوز الحد الأقصى.");
    }

    const { skip, take } = toSkipTake(query.page, query.limit);
    const [payments, total] = await this.repo.findManyWithCount(
      buildPaymentWhere(query),
      buildPaymentOrderBy(query),
      skip,
      take,
    );

    return { payments, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async getById(id: string): Promise<PaymentRow> {
    const payment = await this.repo.findById(id);
    if (!payment) throw new ApiError(404, "الدفعة غير موجودة.");
    return payment;
  }

  // ==================== Update (PENDING only) ====================

  async update(
    id: string,
    dto: UpdatePaymentDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<PaymentRow> {
    return this.repo.transaction(async (t) => {
      const payment = await this.getPaymentOrFail(t, id);

      // Business Rule: لا تعديل لدفعة مكتملة إلا لو سمحت السياسة (لا تسمح)
      if (payment.status === "COMPLETED" && !ALLOW_COMPLETED_PAYMENT_EDIT) {
        throw new ApiError(
          400,
          "الدفعات المكتملة غير قابلة للتعديل. سجّل ردّ مبلغ ثم أنشئ دفعة جديدة.",
        );
      }
      if (payment.status !== "PENDING") {
        throw new ApiError(
          400,
          `لا يمكن تعديل دفعة حالتها «${PAYMENT_STATUS_AR[payment.status]}».`,
        );
      }

      // إعادة تحقق السقف عند تغيير المبلغ (باستبعاد مبلغ هذه الدفعة المعلق)
      if (dto.amount !== undefined) {
        const order = await t.findOrderById(payment.orderId);
        if (!order) throw new ApiError(404, "الطلب غير موجود.");

        const sums = await t.getOrderPaymentSums(payment.orderId);
        const committed = sums.paidNet
          .add(sums.pendingSum)
          .sub(payment.amount)
          .add(toDecimal(dto.amount));
        if (committed.gt(order.total)) {
          throw new ApiError(
            400,
            `المبلغ يتجاوز إجمالي الطلب: ${committed.toFixed(2)} مقابل ${order.total.toFixed(2)}.`,
          );
        }
      }

      await t.updatePayment(id, {
        ...(dto.amount !== undefined ? { amount: toDecimal(dto.amount) } : {}),
        ...(dto.method !== undefined ? { method: dto.method } : {}),
        ...(dto.reference !== undefined ? { reference: dto.reference } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      });

      await this.recomputeOrder(t, payment.orderId);
      await t.createAudit({
        action: "PAYMENT_UPDATED",
        userId: actor.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: { paymentId: id, orderId: payment.orderId, changes: { ...dto } },
      });

      return this.getPaymentOrFail(t, id);
    });
  }

  // ==================== Refund (Transactional) ====================

  async refund(
    id: string,
    dto: RefundPaymentDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<PaymentRow> {
    let refundAmountForNotification = 0;

    const payment = await this.repo.transaction(async (t) => {
      const payment = await this.getPaymentOrFail(t, id);

      if (payment.status === "REFUNDED") {
        throw new ApiError(400, "الدفعة مستردة بالكامل بالفعل.");
      }
      if (payment.status !== "COMPLETED") {
        throw new ApiError(
          400,
          `لا يُردّ المبلغ إلا لدفعة مكتملة، وحالة هذه الدفعة «${PAYMENT_STATUS_AR[payment.status]}».`,
        );
      }

      // Business Rule: الاسترداد لا يتجاوز المتبقي من المدفوع
      const remaining = payment.amount.sub(payment.refundedAmount);
      const refundAmount = dto.amount !== undefined ? toDecimal(dto.amount) : remaining;
      if (refundAmount.gt(remaining)) {
        throw new ApiError(
          400,
          `مبلغ الردّ يتجاوز المتاح للردّ: ${refundAmount.toFixed(2)} مقابل ${remaining.toFixed(2)}.`,
        );
      }
      refundAmountForNotification = refundAmount.toNumber();

      const newRefunded = payment.refundedAmount.add(refundAmount);
      await t.updatePayment(id, {
        refundedAmount: newRefunded,
        // مستردة بالكامل → REFUNDED، جزئياً → تبقى COMPLETED
        ...(newRefunded.gte(payment.amount) ? { status: "REFUNDED" } : {}),
        ...(dto.reason ? { notes: dto.reason } : {}),
      });

      // Business Rule: إعادة حساب الرصيد بعد الاسترداد - داخل نفس الـ Transaction
      await this.recomputeOrder(t, payment.orderId);
      await t.createAudit({
        action: "PAYMENT_REFUNDED",
        userId: actor.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: {
          paymentId: id,
          orderId: payment.orderId,
          refundAmount: refundAmount.toNumber(),
          reason: dto.reason ?? null,
        },
      });

      return this.getPaymentOrFail(t, id);
    });

    notificationBus.emitNotification({
      type: "PAYMENT_REFUNDED",
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
        orderNumber: payment.order.orderNumber,
        refundAmount: refundAmountForNotification,
        refundedByEmail: actor.email,
      },
    });

    return payment;
  }

  // ==================== Cancel (PENDING only) ====================

  async cancel(
    id: string,
    dto: CancelPaymentDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<PaymentRow> {
    const payment = await this.repo.transaction(async (t) => {
      const payment = await this.getPaymentOrFail(t, id);

      if (payment.status !== "PENDING") {
        throw new ApiError(
          400,
          payment.status === "COMPLETED"
            ? "Completed payments cannot be cancelled. Use refund"
            : `Cannot cancel a ${payment.status} payment`,
        );
      }

      await t.updatePayment(id, {
        status: "CANCELLED",
        ...(dto.reason ? { notes: dto.reason } : {}),
      });

      await this.recomputeOrder(t, payment.orderId);
      await t.createAudit({
        action: "PAYMENT_CANCELLED",
        userId: actor.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: { paymentId: id, orderId: payment.orderId, reason: dto.reason ?? null },
      });

      return this.getPaymentOrFail(t, id);
    });

    notificationBus.emitNotification({
      type: "PAYMENT_CANCELLED",
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
        orderNumber: payment.order.orderNumber,
        amount: payment.amount.toNumber(),
        cancelledByEmail: actor.email,
      },
    });

    return payment;
  }

  // ==================== Receipt (Print / PDF) ====================

  /**
   * Business Rule: الإيصال إثبات استلام مال فعلي - يُسمح فقط لدفعة COMPLETED
   * (محصَّلة) أو REFUNDED (إيصال يوضّح الاسترداد). PENDING/FAILED/CANCELLED
   * لا تُنتج إيصالاً (منع طباعة "إيصال" لمال لم يُستلم فعلاً).
   */
  private async loadReceiptContext(id: string): Promise<{ payment: PaymentRow; html: string }> {
    const payment = await this.repo.findById(id);
    if (!payment) throw new ApiError(404, "الدفعة غير موجودة.");

    if (payment.status !== "COMPLETED" && payment.status !== "REFUNDED") {
      throw new ApiError(
        400,
        `لا يُصدَر إيصال لدفعة حالتها «${PAYMENT_STATUS_AR[payment.status]}» — الإيصال للمكتملة والمستردة فقط.`,
      );
    }

    const company = await this.settingsRepo.getOrCreate();
    return { payment, html: buildPaymentReceiptHtml(payment, company) };
  }

  /** GET /:id/receipt - HTML خام قابل للطباعة مباشرة (بلا Puppeteer) */
  async getReceiptHtml(id: string): Promise<string> {
    const { html } = await this.loadReceiptContext(id);
    return html;
  }

  /** GET /:id/receipt/pdf - PDF عبر المحرّك المشترك lib/pdf */
  async getReceiptPdf(id: string): Promise<{ buffer: Buffer; reference: string }> {
    const { payment, html } = await this.loadReceiptContext(id);
    const buffer = await renderHtmlToPdf(html);
    return { buffer, reference: payment.reference ?? payment.id.slice(0, 12) };
  }
}
