import { Prisma } from "@prisma/client";
import type { AuditAction, InvoiceStatus } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { RequestContext } from "../auth/auth.types.js";
import type { EmailService } from "../email/index.js";
import { notificationBus } from "../notifications/index.js";
import { PaymentsRepository, PaymentsTxRepository, type PaymentRow } from "../payments/index.js";
import { deriveOrderPaymentStatus } from "../payments/payments.utils.js";
import type { SettingsRepository } from "../settings/index.js";
import { generateInvoiceBarcodeDataUrl, generateInvoiceQrDataUrl } from "./invoice.codes.js";
import { TERMINAL_STATUSES } from "./invoice.constants.js";
import type {
  CreateInvoiceDto,
  CreateInvoicePaymentDto,
  EmailInvoiceDto,
  ListInvoicePaymentsQuery,
  ListInvoicesQuery,
  UpdateInvoiceDto,
} from "./invoice.dto.js";
import { renderHtmlToPdf } from "../../lib/pdf.js";
import type { InvoicesRepository, OrderForInvoice } from "./invoice.repository.js";
import { buildInvoiceHtml, INVOICE_STATUS_LABELS } from "./invoice.template.js";
import type {
  InvoiceDetail,
  InvoiceItemSnapshot,
  InvoiceListRow,
  InvoiceTotals,
  ListInvoicePaymentsResult,
  ListInvoicesResult,
  PaginationMeta,
} from "./invoice.types.js";

const ZERO = new Prisma.Decimal(0);

export class InvoicesService {
  constructor(
    private readonly repo: InvoicesRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly emailService: EmailService,
    private readonly paymentsRepo: PaymentsRepository,
  ) {}

  // ==================== Derived Payment State (Source of Truth = Order Payments) ====================

  /**
   * Business Rule (قرار المرحلة): paidAmount/remainingAmount/status تُشتق حيّاً
   * من صافي مدفوعات الطلب عند كل قراءة - مصدر حقيقة واحد، فتبقى صحيحة تلقائياً
   * مهما حدث Refund/حذف دفعة من أي مكان. السقف/المتبقّي محسوبان مقابل
   * Invoice.total (بالضريبة). DRAFT/CANCELLED حالتان يدويتان لا يغيّرهما الدفع.
   */
  private deriveState(
    total: Prisma.Decimal,
    status: InvoiceStatus,
    paidNet: Prisma.Decimal,
  ): { paidAmount: Prisma.Decimal; remainingAmount: Prisma.Decimal; status: InvoiceStatus } {
    return {
      paidAmount: paidNet,
      remainingAmount: Prisma.Decimal.max(total.sub(paidNet), ZERO),
      status: this.deriveStatus(status, total, paidNet),
    };
  }

  /** يُرفِق الحالة المُشتقة الحيّة لفاتورة تفاصيل واحدة */
  private async attachDerived(invoice: InvoiceDetail): Promise<InvoiceDetail> {
    const paidNet = await this.paymentsRepo.getOrderPaidNet(invoice.orderId);
    return { ...invoice, ...this.deriveState(invoice.total, invoice.status, paidNet) };
  }

  /** يُرفِق الحالة المُشتقة الحيّة لقائمة فواتير دفعة واحدة (بلا N+1) */
  private async attachDerivedList(rows: InvoiceListRow[]): Promise<InvoiceListRow[]> {
    const netByOrder = await this.paymentsRepo.getOrderPaidNetBatch(rows.map((r) => r.orderId));
    return rows.map((row) => ({
      ...row,
      ...this.deriveState(row.total, row.status, netByOrder.get(row.orderId) ?? ZERO),
    }));
  }

  // ==================== Pagination (Phase 1 - no shared utils.ts per file list) ====================

  private toSkipTake(page: number, limit: number): { skip: number; take: number } {
    return { skip: (page - 1) * limit, take: limit };
  }

  private buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
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

  // ==================== Query Builders ====================

  private buildWhere(query: ListInvoicesQuery): Prisma.InvoiceWhereInput {
    const where: Prisma.InvoiceWhereInput = {};

    if (query.search !== undefined) {
      where.OR = [
        { invoiceNumber: { contains: query.search, mode: "insensitive" } },
        { customer: { name: { contains: query.search, mode: "insensitive" } } },
        { customer: { phone: { contains: query.search } } },
      ];
    }
    if (query.status !== undefined) where.status = query.status;
    if (query.customerId !== undefined) where.customerId = query.customerId;
    if (query.branchId !== undefined) where.branchId = query.branchId;
    if (query.orderId !== undefined) where.orderId = query.orderId;

    if (query.issuedFrom !== undefined || query.issuedTo !== undefined) {
      where.issuedAt = {
        ...(query.issuedFrom !== undefined ? { gte: query.issuedFrom } : {}),
        ...(query.issuedTo !== undefined ? { lte: query.issuedTo } : {}),
      };
    }

    return where;
  }

  private buildOrderBy(query: ListInvoicesQuery): Prisma.InvoiceOrderByWithRelationInput {
    return { [query.sortBy]: query.sortOrder };
  }

  // ==================== Guards ====================

  private async getInvoiceOrFail(id: string): Promise<InvoiceDetail> {
    const invoice = await this.repo.findById(id);
    if (!invoice) throw new ApiError(404, "الفاتورة غير موجودة.");
    return this.attachDerived(invoice);
  }

  /** Business Rule: لا تعديل لفاتورة ملغاة - حالة نهائية */
  private ensureMutable(invoice: InvoiceDetail): void {
    if (TERMINAL_STATUSES.includes(invoice.status)) {
      throw new ApiError(
        400,
        `لا يمكن تعديل الفاتورة بعد أن أصبحت حالتها «${INVOICE_STATUS_LABELS[invoice.status]}».`,
      );
    }
  }

  /**
   * Business Rule: PARTIALLY_PAID/PAID تُشتق دائماً من paidAmount مقابل
   * total - لا تُقبل كطلب تعيين يدوي مباشر (راجع MANUALLY_SETTABLE_STATUSES)
   */
  private deriveStatus(
    base: InvoiceStatus,
    total: Prisma.Decimal,
    paidAmount: Prisma.Decimal,
  ): InvoiceStatus {
    if (base === "DRAFT" || base === "CANCELLED") return base;
    if (paidAmount.lte(0)) return "ISSUED";
    if (paidAmount.gte(total)) return "PAID";
    return "PARTIALLY_PAID";
  }

  /**
   * Business Rule: لا يُعاد حساب subtotal/discount/items من بنود الطلب مجدداً -
   * تُنسَخ كما هي من الطلب (الذي حسبها بالفعل عبر orders.utils.computeTotals)
   * لتفادي تكرار منطق التسعير بوحدتين مختلفتين
   */
  private snapshotFromOrder(order: OrderForInvoice, tax: number): InvoiceTotals {
    const items: InvoiceItemSnapshot[] = order.items.map((item) => ({
      serviceId: item.serviceId,
      serviceNameSnapshot: item.service.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.subtotal,
    }));

    const subtotal = order.subtotal;
    const discount = order.discount;
    const taxDecimal = new Prisma.Decimal(tax);
    const total = subtotal.sub(discount).add(taxDecimal);
    const paidAmount = order.paidAmount;
    const remainingAmount = Prisma.Decimal.max(total.sub(paidAmount), ZERO);

    return { subtotal, discount, tax: taxDecimal, total, paidAmount, remainingAmount, items };
  }

  // ==================== Create ====================

  async create(dto: CreateInvoiceDto, actor: AuthenticatedUser): Promise<InvoiceDetail> {
    const order = await this.repo.findOrderForInvoice(dto.orderId);
    if (!order) throw new ApiError(404, "الطلب غير موجود.");

    // Business Rule: لا فاتورة لطلب ملغي
    if (order.status === "CANCELLED") {
      throw new ApiError(400, "لا يمكن إصدار فاتورة لطلب ملغي.");
    }

    // Business Rule: فاتورة واحدة لكل طلب (orderId فريد بالـSchema أيضاً - خط دفاع أخير)
    const existing = await this.repo.findByOrderId(dto.orderId);
    if (existing) {
      throw new ApiError(409, `للطلب فاتورة صادرة بالفعل (${existing.invoiceNumber}).`);
    }

    const totals = this.snapshotFromOrder(order, dto.tax);
    const status = this.deriveStatus(dto.status, totals.total, totals.paidAmount);

    const invoice = await this.repo.createInvoiceWithItems({
      orderId: dto.orderId,
      customerId: order.customerId,
      branchId: order.branchId,
      createdById: actor.id,
      status,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total,
      paidAmount: totals.paidAmount,
      remainingAmount: totals.remainingAmount,
      dueDate: dto.dueDate ?? null,
      notes: dto.notes ?? null,
      items: totals.items,
    });

    notificationBus.emitNotification({
      type: "INVOICE_CREATED",
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        orderNumber: invoice.order.orderNumber,
        customerName: invoice.customer.name,
        total: invoice.total.toNumber(),
        createdByName: invoice.createdBy.name,
      },
    });

    return invoice;
  }

  // ==================== Read ====================

  async list(query: ListInvoicesQuery): Promise<ListInvoicesResult> {
    const { skip, take } = this.toSkipTake(query.page, query.limit);
    const [invoices, total] = await this.repo.findManyWithCount(
      this.buildWhere(query),
      this.buildOrderBy(query),
      skip,
      take,
    );

    return {
      invoices: await this.attachDerivedList(invoices),
      meta: this.buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getById(id: string): Promise<InvoiceDetail> {
    return this.getInvoiceOrFail(id);
  }

  async getByNumber(invoiceNumber: string): Promise<InvoiceDetail> {
    const invoice = await this.repo.findByNumber(invoiceNumber);
    if (!invoice) throw new ApiError(404, "الفاتورة غير موجودة.");
    return this.attachDerived(invoice);
  }

  // ==================== Update ====================

  async update(id: string, dto: UpdateInvoiceDto, actor: AuthenticatedUser): Promise<InvoiceDetail> {
    const invoice = await this.getInvoiceOrFail(id);
    this.ensureMutable(invoice);

    // Business Rule: لا رجوع يدوي لـDraft لفاتورة عليها مدفوعات فعلية بالفعل -
    // لا يشمل هذا إصدار مسودة لأول مرة (DRAFT → ISSUED)، فهذا تقدّم للأمام دائماً مسموح
    if (dto.status === "DRAFT" && invoice.status !== "DRAFT" && invoice.paidAmount.gt(0)) {
      throw new ApiError(
        400,
        "لا يمكن إرجاع الفاتورة إلى مسودة بعد تسجيل دفعات عليها.",
      );
    }

    const newTax = dto.tax !== undefined ? new Prisma.Decimal(dto.tax) : invoice.tax;
    const taxChanged = dto.tax !== undefined;
    const newTotal = taxChanged ? invoice.subtotal.sub(invoice.discount).add(newTax) : invoice.total;
    const newRemaining = taxChanged
      ? Prisma.Decimal.max(newTotal.sub(invoice.paidAmount), ZERO)
      : invoice.remainingAmount;

    // الحالة الأساس: التعيين اليدوي إن وُجد، وإلا الحالة الحالية - ثم تُشتق تلقائياً فوقها
    const baseStatus = dto.status ?? invoice.status;
    const derivedStatus = this.deriveStatus(baseStatus, newTotal, invoice.paidAmount);
    const statusChanged = derivedStatus !== invoice.status;

    const auditAction: AuditAction = statusChanged ? "INVOICE_STATUS_CHANGED" : "INVOICE_UPDATED";
    const metadata: Prisma.InputJsonValue = {
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      ...(statusChanged ? { oldStatus: invoice.status, newStatus: derivedStatus } : {}),
      changes: {
        ...(dto.tax !== undefined ? { tax: dto.tax } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    };

    return this.repo.updateInvoice(
      id,
      {
        status: derivedStatus !== invoice.status ? derivedStatus : undefined,
        ...(taxChanged ? { tax: newTax, total: newTotal, remainingAmount: newRemaining } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        updatedById: actor.id,
      },
      auditAction,
      metadata,
    );
  }

  // ==================== Delete ====================

  async delete(id: string, actor: AuthenticatedUser): Promise<void> {
    const invoice = await this.getInvoiceOrFail(id);

    // Business Rule: لا حذف لفاتورة مدفوعة بالكامل - سجل مالي مكتمل (Cancel بدلاً منه)
    if (invoice.status === "PAID") {
      throw new ApiError(400, "لا يمكن حذف فاتورة مدفوعة بالكامل. ألغِها بدلاً من حذفها.");
    }

    await this.repo.deleteInvoice(id, actor.id, {
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      orderId: invoice.orderId,
      status: invoice.status,
    });
  }

  // ==================== Documents (Print/PDF/Download/Email) ====================

  /**
   * Business Rule: لا مستندات لفاتورة DRAFT - غير مُعتمَدة رسمياً بعد
   * (لا يشمل هذا CANCELLED عمداً - فاتورة ملغاة تبقى مستنداً حقيقياً للسجلات،
   * وحالتها الملغاة تظهر بوضوح داخل المستند نفسه)
   */
  private ensureFinalized(invoice: InvoiceDetail): void {
    if (invoice.status === "DRAFT") {
      throw new ApiError(400, "لا يمكن إصدار مستندات لفاتورة مسودة. أصدِر الفاتورة أولاً.");
    }
  }

  /** محتوى QR نصي مُهيكَل - لا رابط تحقق وهمي لصفحة غير موجودة بالمشروع */
  private buildQrContent(invoice: InvoiceDetail): string {
    return `Invoice:${invoice.invoiceNumber}|Order:${invoice.order.orderNumber}|Total:${invoice.total.toFixed(2)}`;
  }

  /** يبني HTML الفاتورة الكامل - مصدر واحد يُستهلَك من Print وPDF ومرفق البريد */
  private async buildInvoiceDocument(invoice: InvoiceDetail): Promise<string> {
    const company = await this.settingsRepo.getOrCreate();
    const [qrDataUrl, barcodeDataUrl] = await Promise.all([
      generateInvoiceQrDataUrl(this.buildQrContent(invoice)),
      generateInvoiceBarcodeDataUrl(invoice.invoiceNumber),
    ]);
    return buildInvoiceHtml({ invoice, company, qrDataUrl, barcodeDataUrl });
  }

  /** GET /:id/print - HTML خام قابل للطباعة مباشرة بالمتصفح (بلا Puppeteer) */
  async getPrintHtml(id: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<string> {
    const invoice = await this.getInvoiceOrFail(id);
    this.ensureFinalized(invoice);

    const html = await this.buildInvoiceDocument(invoice);

    await this.repo.createDocumentAudit({
      action: "INVOICE_PRINTED",
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { invoiceId: id, invoiceNumber: invoice.invoiceNumber },
    });

    return html;
  }

  /** GET /:id/pdf وGET /:id/download - نفس ملف PDF، Content-Disposition مختلف بالـController فقط */
  async getPdfBuffer(
    id: string,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<{ buffer: Buffer; invoiceNumber: string }> {
    const invoice = await this.getInvoiceOrFail(id);
    this.ensureFinalized(invoice);

    const html = await this.buildInvoiceDocument(invoice);
    const buffer = await renderHtmlToPdf(html);

    await this.repo.createDocumentAudit({
      action: "INVOICE_DOWNLOADED",
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { invoiceId: id, invoiceNumber: invoice.invoiceNumber },
    });

    return { buffer, invoiceNumber: invoice.invoiceNumber };
  }

  /** POST /:id/email - يُرفِق PDF حقيقي عبر EmailService الموجود بالمشروع */
  async emailInvoice(
    id: string,
    dto: EmailInvoiceDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<void> {
    const invoice = await this.getInvoiceOrFail(id);
    this.ensureFinalized(invoice);

    const company = await this.settingsRepo.getOrCreate();
    const [qrDataUrl, barcodeDataUrl] = await Promise.all([
      generateInvoiceQrDataUrl(this.buildQrContent(invoice)),
      generateInvoiceBarcodeDataUrl(invoice.invoiceNumber),
    ]);
    const html = buildInvoiceHtml({ invoice, company, qrDataUrl, barcodeDataUrl });
    const buffer = await renderHtmlToPdf(html);

    await this.emailService.sendInvoiceEmail(
      dto.email,
      {
        companyName: company.companyName,
        invoiceNumber: invoice.invoiceNumber,
        orderNumber: invoice.order.orderNumber,
        customerName: invoice.customer.name,
        totalFormatted: `${invoice.total.toFixed(2)} ${company.defaultCurrency}`,
        statusLabel: INVOICE_STATUS_LABELS[invoice.status],
      },
      buffer,
      `${invoice.invoiceNumber}.pdf`,
    );

    await this.repo.createDocumentAudit({
      action: "INVOICE_EMAILED",
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { invoiceId: id, invoiceNumber: invoice.invoiceNumber, email: dto.email },
    });

    // بعد نجاح الإرسال الفعلي فقط - فشل البريد أعلاه يرمي قبل الوصول هنا
    notificationBus.emitNotification({
      type: "INVOICE_SENT",
      data: {
        invoiceId: id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer.name,
        sentTo: dto.email,
      },
    });
  }

  // ==================== Payments Integration ====================

  /** GET /:id/payments - كل مدفوعات طلب الفاتورة مع ترقيم (مصدرها وحدة payments) */
  async listInvoicePayments(
    invoiceId: string,
    query: ListInvoicePaymentsQuery,
  ): Promise<ListInvoicePaymentsResult> {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new ApiError(404, "الفاتورة غير موجودة.");

    const { skip, take } = this.toSkipTake(query.page, query.limit);
    const [payments, total] = await this.paymentsRepo.findManyWithCount(
      { orderId: invoice.orderId },
      { [query.sortBy]: query.sortOrder },
      skip,
      take,
    );

    return { payments, meta: this.buildPaginationMeta(query.page, query.limit, total) };
  }

  /**
   * POST /:id/payments - إنشاء دفعة على طلب الفاتورة ذرياً:
   * تحقق (فاتورة/طلب غير ملغى + سقف = Invoice.total بالضريبة) → إنشاء الدفعة →
   * إعادة حساب حالة دفع الطلب → تحديث كاش الفاتورة → تدقيق - كلها Transaction واحدة.
   * منطق الدفع نفسه مُعاد استخدامه من PaymentsTxRepository (بلا تكرار).
   */
  async createInvoicePayment(
    invoiceId: string,
    dto: CreateInvoicePaymentDto,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<PaymentRow> {
    const payment = await this.repo.transaction(async (tx) => {
      const ptx = new PaymentsTxRepository(tx);

      const invoice = await this.repo.findPaymentStateFieldsTx(tx, invoiceId);
      if (!invoice) throw new ApiError(404, "الفاتورة غير موجودة.");

      // Business Rule: لا دفعة لفاتورة ملغاة
      if (invoice.status === "CANCELLED") {
        throw new ApiError(400, "لا يمكن تسجيل دفعة على فاتورة ملغاة.");
      }

      const order = await ptx.findOrderById(invoice.orderId);
      if (!order) throw new ApiError(404, "الطلب غير موجود.");
      if (order.status === "CANCELLED") {
        throw new ApiError(400, "لا يمكن تسجيل دفعة على طلب ملغي.");
      }

      // Business Rule: السقف = إجمالي الفاتورة (بالضريبة) - يمنع الدفع الزائد
      const sums = await ptx.getOrderPaymentSums(invoice.orderId);
      const amount = new Prisma.Decimal(dto.amount);
      const committed = sums.paidNet.add(sums.pendingSum).add(amount);
      if (committed.gt(invoice.total)) {
        throw new ApiError(
          400,
          `المبلغ يتجاوز إجمالي الفاتورة: ${committed.toFixed(2)} مقابل ${invoice.total.toFixed(2)}.`,
        );
      }

      const payment = await ptx.createPayment({
        orderId: invoice.orderId,
        amount,
        method: dto.method,
        status: dto.status,
        reference: dto.reference ?? null,
        notes: dto.notes ?? null,
        receivedById: actor.id,
      });

      // إعادة حساب حالة دفع الطلب (بدلالة Order.total كما هو نظام الطلبات)
      const newSums = await ptx.getOrderPaymentSums(invoice.orderId);
      await ptx.updateOrderPaymentState(
        invoice.orderId,
        newSums.paidNet,
        deriveOrderPaymentStatus(order.total, newSums.paidNet, newSums.refundedSum),
      );

      // تحديث كاش الفاتورة (بدلالة Invoice.total بالضريبة) داخل نفس الـTransaction
      const derived = this.deriveState(invoice.total, invoice.status, newSums.paidNet);
      await this.repo.updateInvoicePaymentStateTx(
        tx,
        invoiceId,
        derived.paidAmount,
        derived.remainingAmount,
        derived.status,
      );

      // تدقيق - نفس فعل PAYMENT_CREATED (بلا فعل تدقيق جديد) مع علامة via:invoice
      await ptx.createAudit({
        action: "PAYMENT_CREATED",
        userId: actor.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: {
          paymentId: payment.id,
          orderId: invoice.orderId,
          invoiceId,
          amount: dto.amount,
          method: dto.method,
          status: dto.status,
          via: "invoice",
        },
      });

      const full = await ptx.findPaymentById(payment.id);
      if (!full) throw new ApiError(500, "تعذّر تحميل الدفعة بعد إنشائها.");
      return full;
    });

    // نفس حدث PAYMENT_RECEIVED الذي تُطلقه payments.service.create() - دفعة
    // حقيقية بصرف النظر عن مسار إنشائها (مباشرة أو عبر الفاتورة)
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
}
