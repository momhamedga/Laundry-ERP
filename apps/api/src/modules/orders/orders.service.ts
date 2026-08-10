import type { Service } from "@prisma/client";
import { ORDER_STATUS_AR } from "../../constants/status-labels.js";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { AuthenticatedUser } from "../auth/index.js";
import { notificationBus } from "../notifications/index.js";
import type {
  CancelOrderDto,
  ChangeStatusDto,
  CreateOrderDto,
  ListOrdersQuery,
  OrderItemDto,
  UpdateOrderDto,
} from "./orders.dto.js";
import type { OrdersRepository } from "./orders.repository.js";
import type {
  HistoryEntry,
  ListOrdersResult,
  OrderDetail,
} from "./orders.types.js";
import {
  buildOrderOrderBy,
  buildOrderWhere,
  buildPaginationMeta,
  canTransition,
  computeTotals,
  derivePaymentStatus,
  isTerminal,
  toSkipTake,
} from "./orders.utils.js";

export class OrdersService {
  constructor(private readonly repo: OrdersRepository) {}

  // ==================== Guards ====================

  private async getOrderOrFail(id: string): Promise<OrderDetail> {
    const order = await this.repo.findById(id);
    if (!order) throw new ApiError(404, "الطلب غير موجود.");
    return order;
  }

  /** Business Rule: يمنع التعديل بعد DELIVERED أو CANCELLED */
  private ensureMutable(order: OrderDetail): void {
    if (isTerminal(order.status)) {
      throw new ApiError(
        400,
        `لا يمكن تعديل الطلب بعد أن أصبحت حالته «${ORDER_STATUS_AR[order.status]}».`,
      );
    }
  }

  /** Business Rule: لا طلب بدون عميل موجود ونشط */
  private async resolveCustomer(customerId: string): Promise<void> {
    const customer = await this.repo.findCustomerById(customerId);
    if (!customer) throw new ApiError(404, "العميل غير موجود.");
    if (!customer.isActive) throw new ApiError(400, "حساب العميل موقوف.");
  }

  /** الفرع من الطلب أو من حساب المنشئ */
  private async resolveBranchId(
    dtoBranchId: string | undefined,
    actor: AuthenticatedUser,
  ): Promise<string> {
    const branchId = dtoBranchId ?? actor.branchId;
    if (!branchId) {
      throw new ApiError(400, "حسابك غير مرتبط بأي فرع. اختر فرعاً للطلب، أو اطلب من المسؤول تعيين فرع لحسابك.");
    }
    const branch = await this.repo.findBranchById(branchId);
    if (!branch) throw new ApiError(404, "الفرع غير موجود.");
    if (!branch.isActive) throw new ApiError(400, "الفرع غير نشط.");
    return branchId;
  }

  /**
   * Business Rule: لا يمكن استخدام خدمة غير مفعلة أو ضمن تصنيف معطل
   * جلب واحد لكل الخدمات - لا N+1
   */
  private async resolveServices(
    items: readonly OrderItemDto[],
  ): Promise<Map<string, Service>> {
    const ids = [...new Set(items.map((i) => i.serviceId))];
    const services = await this.repo.findServicesWithCategory(ids);
    const byId = new Map(services.map((s) => [s.id, s]));

    for (const id of ids) {
      const service = byId.get(id);
      if (!service) throw new ApiError(404, `الخدمة غير موجودة (${id}).`);
      if (!service.isActive) {
        throw new ApiError(400, `الخدمة «${service.name}» غير مفعّلة.`);
      }
      if (!service.category.isActive) {
        throw new ApiError(
          400,
          `الخدمة «${service.name}» تتبع تصنيفاً معطَّلاً (${service.category.name}).`,
        );
      }
    }
    return byId;
  }

  // ==================== Create ====================

  async create(dto: CreateOrderDto, actor: AuthenticatedUser): Promise<OrderDetail> {
    await this.resolveCustomer(dto.customerId);
    const branchId = await this.resolveBranchId(dto.branchId, actor);
    const services = await this.resolveServices(dto.items);

    // الإجماليات تُحسب بالخادم فقط - أي قيم مالية من الـ client تُتجاهل
    const totals = computeTotals(dto.items, services, dto.discount);

    const order = await this.repo.createOrderWithItems({
      customerId: dto.customerId,
      branchId,
      createdById: actor.id,
      receivedAt: dto.receivedAt,
      dueDate: dto.dueDate,
      notes: dto.notes ?? null,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      items: totals.items,
    });

    notificationBus.emitNotification({
      type: "ORDER_CREATED",
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer.name,
        createdByName: order.createdBy.name,
      },
    });

    return order;
  }

  // ==================== Read ====================

  async list(query: ListOrdersQuery): Promise<ListOrdersResult> {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const [orders, total] = await this.repo.findManyWithCount(
      buildOrderWhere(query),
      buildOrderOrderBy(query),
      skip,
      take,
    );

    return { orders, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async getById(id: string): Promise<OrderDetail> {
    return this.getOrderOrFail(id);
  }

  async getByNumber(orderNumber: string): Promise<OrderDetail> {
    const order = await this.repo.findByNumber(orderNumber);
    if (!order) throw new ApiError(404, "الطلب غير موجود.");
    return order;
  }

  async getHistory(id: string): Promise<HistoryEntry[]> {
    await this.getOrderOrFail(id);
    return this.repo.findHistory(id);
  }

  // ==================== Update ====================

  async update(id: string, dto: UpdateOrderDto): Promise<OrderDetail> {
    const order = await this.getOrderOrFail(id);
    this.ensureMutable(order);

    // dueDate الجديد يجب أن يبقى بعد receivedAt الثابت
    if (dto.dueDate !== undefined && dto.dueDate.getTime() <= order.receivedAt.getTime()) {
      throw new ApiError(400, "تاريخ التسليم يجب أن يكون بعد تاريخ الاستلام.");
    }

    // إعادة حساب الإجماليات عند تغيير العناصر أو الخصم - بالخادم فقط
    const needsRecompute = dto.items !== undefined || dto.discount !== undefined;
    if (!needsRecompute) {
      return this.repo.updateOrderWithItems(id, {
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      });
    }

    const itemsInput: OrderItemDto[] =
      dto.items ??
      order.items.map((i) => ({
        serviceId: i.serviceId,
        quantity: Number(i.quantity),
        discount: Number(i.discount),
        notes: i.notes,
      }));

    const services = await this.resolveServices(itemsInput);
    const totals = computeTotals(
      itemsInput,
      services,
      dto.discount ?? Number(order.discount),
    );

    return this.repo.updateOrderWithItems(id, {
      ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      paymentStatus: derivePaymentStatus(totals.total, order.paidAmount),
      ...(dto.items !== undefined ? { items: totals.items } : {}),
    });
  }

  // ==================== Status ====================

  async changeStatus(
    id: string,
    dto: ChangeStatusDto,
    actor: AuthenticatedUser,
  ): Promise<OrderDetail> {
    const order = await this.getOrderOrFail(id);

    // Business Rule: لا رجوع لحالة سابقة + الحالات النهائية مقفلة
    if (!canTransition(order.status, dto.status)) {
      throw new ApiError(
        400,
        `لا يمكن نقل الطلب من «${ORDER_STATUS_AR[order.status]}» إلى «${ORDER_STATUS_AR[dto.status]}».`,
      );
    }

    const updated = await this.repo.changeStatus(
      id,
      order.status,
      dto.status,
      actor.id,
      dto.notes ?? null,
      dto.status === "DELIVERED" ? new Date() : undefined,
    );

    // extraUserIds: موظف الطلب (منشئه) يُبلَّغ دائماً بصرف النظر عن دوره،
    // بالإضافة لبثّ ADMIN/MANAGER الإشرافي العام (راجع notification.constants.ts)
    notificationBus.emitNotification({
      type: "ORDER_STATUS_CHANGED",
      data: {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        customerName: updated.customer.name,
        oldStatus: order.status,
        newStatus: dto.status,
        changedByEmail: actor.email,
      },
      extraUserIds: [updated.createdById],
    });

    return updated;
  }

  async cancel(
    id: string,
    dto: CancelOrderDto,
    actor: AuthenticatedUser,
  ): Promise<OrderDetail> {
    const order = await this.getOrderOrFail(id);
    this.ensureMutable(order); // DELIVERED/CANCELLED لا يُلغى

    const updated = await this.repo.changeStatus(
      id,
      order.status,
      "CANCELLED",
      actor.id,
      dto.notes ?? null,
    );

    notificationBus.emitNotification({
      type: "ORDER_CANCELLED",
      data: {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        customerName: updated.customer.name,
        reason: dto.notes ?? null,
        cancelledByEmail: actor.email,
      },
      extraUserIds: [updated.createdById],
    });

    return updated;
  }
}
