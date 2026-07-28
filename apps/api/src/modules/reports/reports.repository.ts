import { Prisma } from "@prisma/client";
import type { AuditAction, PrismaClient } from "@prisma/client";
import type {
  BranchesReportQuery,
  CustomersReportQuery,
  EmployeesReportQuery,
  OrdersReportQuery,
  PaymentsReportQuery,
  ServicesReportQuery,
} from "./reports.dto.js";

/**
 * Repository Pattern - قراءات فقط، بلا أي كتابة. عابر لحدود الوحدات عمداً
 * (نفس سابقة stats.repository.ts وbackup.repository.ts) - طبيعة التقارير
 * تجميع من كل مكان. بلا SQL Raw إطلاقاً - Prisma Query Builder فقط (aggregate/
 * groupBy/findMany)، وتجميع بالذاكرة فقط حيث لا تدعم Prisma علاقة مباشرة
 * (مثلاً Payment لا يملك branchId مباشراً - فقط عبر order.branchId).
 */
export class ReportsRepository {
  constructor(private readonly db: PrismaClient) {}

  // ==================== Audit (Phase 5 - تصدير التقارير فقط) ====================

  createAuditLog(entry: {
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

  // ==================== 1) Orders Report ====================

  private buildOrdersWhere(query: OrdersReportQuery): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};
    if (query.from !== undefined || query.to !== undefined) {
      where.receivedAt = {
        ...(query.from !== undefined ? { gte: query.from } : {}),
        ...(query.to !== undefined ? { lte: query.to } : {}),
      };
    }
    if (query.branchId !== undefined) where.branchId = query.branchId;
    if (query.customerId !== undefined) where.customerId = query.customerId;
    if (query.status !== undefined) where.status = query.status;
    return where;
  }

  async ordersSummary(query: OrdersReportQuery) {
    const where = this.buildOrdersWhere(query);
    const totalOrders = await this.db.order.count({ where });

    // فلتر status=CANCELLED صريح يعني كل الطلبات المطابقة ملغاة - لا إيراد بالتعريف (الإيراد يستبعد الملغاة دوماً)
    if (query.status === "CANCELLED") {
      return { totalOrders, totalRevenue: new Prisma.Decimal(0), nonCancelledCount: 0 };
    }

    const revenueAgg = await this.db.order.aggregate({
      // status الصريح (إن وُجد) أصلاً غير CANCELLED هنا - وإلا نستبعد الملغاة فقط
      where: { ...where, status: query.status ?? { not: "CANCELLED" } },
      _sum: { total: true },
      _count: { _all: true },
    });
    return {
      totalOrders,
      totalRevenue: revenueAgg._sum.total ?? new Prisma.Decimal(0),
      nonCancelledCount: revenueAgg._count._all,
    };
  }

  async ordersList(query: OrdersReportQuery, skip: number, take: number) {
    const where = this.buildOrdersWhere(query);
    const [rows, total] = await Promise.all([
      this.db.order.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take,
        include: {
          customer: { select: { name: true } },
          branch: { select: { name: true } },
        },
      }),
      this.db.order.count({ where }),
    ]);
    return { rows, total };
  }

  // ==================== 2) Payments Report ====================

  private buildPaymentsWhere(query: PaymentsReportQuery): Prisma.PaymentWhereInput {
    const where: Prisma.PaymentWhereInput = {};
    if (query.from !== undefined || query.to !== undefined) {
      where.createdAt = {
        ...(query.from !== undefined ? { gte: query.from } : {}),
        ...(query.to !== undefined ? { lte: query.to } : {}),
      };
    }
    if (query.branchId !== undefined) where.order = { branchId: query.branchId };
    if (query.method !== undefined) where.method = query.method;
    if (query.status !== undefined) where.status = query.status;
    return where;
  }

  async paymentsSummary(query: PaymentsReportQuery) {
    const where = this.buildPaymentsWhere(query);

    // فلتر status الصريح (إن وُجد) هو مصدر الحقيقة - قائمة فارغة (in: []) تعني صفر نتائج بدل تجاهل الفلتر
    const collectedStatuses: ("COMPLETED" | "REFUNDED")[] =
      query.status === undefined
        ? ["COMPLETED", "REFUNDED"]
        : query.status === "COMPLETED" || query.status === "REFUNDED"
          ? [query.status]
          : [];
    const pendingStatuses: "PENDING"[] =
      query.status === undefined || query.status === "PENDING" ? ["PENDING"] : [];

    const [totalPayments, collectedAgg, pendingAgg] = await Promise.all([
      this.db.payment.count({ where }),
      this.db.payment.aggregate({
        where: { ...where, status: { in: collectedStatuses } },
        _sum: { amount: true, refundedAmount: true },
      }),
      this.db.payment.aggregate({
        where: { ...where, status: { in: pendingStatuses } },
        _sum: { amount: true },
      }),
    ]);
    const gross = collectedAgg._sum.amount ?? new Prisma.Decimal(0);
    const refunded = collectedAgg._sum.refundedAmount ?? new Prisma.Decimal(0);
    return {
      totalPayments,
      totalAmount: gross.sub(refunded),
      refunded,
      pending: pendingAgg._sum.amount ?? new Prisma.Decimal(0),
    };
  }

  async paymentsList(query: PaymentsReportQuery, skip: number, take: number) {
    const where = this.buildPaymentsWhere(query);
    const [rows, total] = await Promise.all([
      this.db.payment.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take,
        include: {
          order: { select: { orderNumber: true, branch: { select: { name: true } } } },
        },
      }),
      this.db.payment.count({ where }),
    ]);
    return { rows, total };
  }

  // ==================== 3) Customers Report ====================

  async customersSummary(query: CustomersReportQuery) {
    const [totalCustomers, newCustomers] = await Promise.all([
      this.db.customer.count(),
      this.db.customer.count({
        where:
          query.from !== undefined || query.to !== undefined
            ? {
                createdAt: {
                  ...(query.from !== undefined ? { gte: query.from } : {}),
                  ...(query.to !== undefined ? { lte: query.to } : {}),
                },
              }
            : undefined,
      }),
    ]);
    return { totalCustomers, newCustomers };
  }

  private buildCustomerOrdersWhere(query: CustomersReportQuery): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};
    if (query.from !== undefined || query.to !== undefined) {
      where.receivedAt = {
        ...(query.from !== undefined ? { gte: query.from } : {}),
        ...(query.to !== undefined ? { lte: query.to } : {}),
      };
    }
    if (query.branchId !== undefined) where.branchId = query.branchId;
    return where;
  }

  /** أعلى العملاء إنفاقاً ضمن الفلاتر - الملغاة مُستبعَدة من totalSpent */
  async topCustomers(query: CustomersReportQuery) {
    const where = this.buildCustomerOrdersWhere(query);
    const grouped = await this.db.order.groupBy({
      by: ["customerId"],
      where: { ...where, status: { not: "CANCELLED" } },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: "desc" } },
      take: query.topLimit,
    });
    if (grouped.length === 0) return [];

    const customers = await this.db.customer.findMany({
      where: { id: { in: grouped.map((g) => g.customerId) } },
      select: { id: true, name: true, phone: true },
    });
    const byId = new Map(customers.map((c) => [c.id, c]));

    return grouped.map((g) => {
      const c = byId.get(g.customerId);
      return {
        id: g.customerId,
        name: c?.name ?? "—",
        phone: c?.phone ?? "—",
        ordersCount: g._count.id,
        totalSpent: g._sum.total ?? new Prisma.Decimal(0),
      };
    });
  }

  /** عملاء لديهم نشاط (طلب واحد على الأقل) ضمن الفلاتر - وليس كل العملاء بلا قيد */
  async customersListWithActivity(query: CustomersReportQuery, skip: number, take: number) {
    const orderWhere = this.buildCustomerOrdersWhere(query);
    const activeCustomers = await this.db.order.findMany({
      where: orderWhere,
      select: { customerId: true },
      distinct: ["customerId"],
    });
    const ids = activeCustomers.map((o) => o.customerId);
    if (ids.length === 0) return { rows: [], total: 0 };

    const [rows, total] = await Promise.all([
      this.db.customer.findMany({
        where: { id: { in: ids } },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take,
      }),
      this.db.customer.count({ where: { id: { in: ids } } }),
    ]);

    const perCustomerAgg = await this.db.order.groupBy({
      by: ["customerId"],
      where: { ...orderWhere, customerId: { in: rows.map((r) => r.id) }, status: { not: "CANCELLED" } },
      _sum: { total: true },
      _count: { id: true },
    });
    const aggById = new Map(perCustomerAgg.map((a) => [a.customerId, a]));

    return {
      rows: rows.map((r) => ({
        ...r,
        ordersCount: aggById.get(r.id)?._count.id ?? 0,
        totalSpent: aggById.get(r.id)?._sum.total ?? new Prisma.Decimal(0),
      })),
      total,
    };
  }

  // ==================== 4) Services Report ====================

  private buildServiceItemWhere(query: ServicesReportQuery): Prisma.OrderItemWhereInput {
    const orderWhere: Prisma.OrderWhereInput = {};
    if (query.from !== undefined || query.to !== undefined) {
      orderWhere.receivedAt = {
        ...(query.from !== undefined ? { gte: query.from } : {}),
        ...(query.to !== undefined ? { lte: query.to } : {}),
      };
    }
    if (query.branchId !== undefined) orderWhere.branchId = query.branchId;
    return Object.keys(orderWhere).length > 0 ? { order: orderWhere } : {};
  }

  /** صف واحد يخدم "الأكثر استخداماً" و"الإيراد لكل خدمة" معاً - sortBy فقط يغيّر الترتيب */
  async servicesUsage(query: ServicesReportQuery, skip: number, take: number) {
    const where = this.buildServiceItemWhere(query);

    const groupedPromise =
      query.sortBy === "timesUsed"
        ? this.db.orderItem.groupBy({
            by: ["serviceId"],
            where,
            _count: { id: true },
            _sum: { quantity: true, subtotal: true },
            orderBy: { _count: { id: query.sortOrder } },
            skip,
            take,
          })
        : query.sortBy === "totalQuantity"
          ? this.db.orderItem.groupBy({
              by: ["serviceId"],
              where,
              _count: { id: true },
              _sum: { quantity: true, subtotal: true },
              orderBy: { _sum: { quantity: query.sortOrder } },
              skip,
              take,
            })
          : this.db.orderItem.groupBy({
              by: ["serviceId"],
              where,
              _count: { id: true },
              _sum: { quantity: true, subtotal: true },
              orderBy: { _sum: { subtotal: query.sortOrder } },
              skip,
              take,
            });

    const [grouped, allGroups] = await Promise.all([
      groupedPromise,
      this.db.orderItem.groupBy({ by: ["serviceId"], where }),
    ]);
    const total = allGroups.length;
    if (grouped.length === 0) return { rows: [], total };

    const services = await this.db.service.findMany({
      where: { id: { in: grouped.map((g) => g.serviceId) } },
      include: { category: { select: { name: true } } },
    });
    const byId = new Map(services.map((s) => [s.id, s]));

    return {
      rows: grouped.map((g) => {
        const s = byId.get(g.serviceId);
        return {
          id: g.serviceId,
          name: s?.name ?? "—",
          categoryName: s?.category.name ?? "—",
          unit: s?.unit ?? "PIECE",
          isActive: s?.isActive ?? false,
          timesUsed: g._count.id,
          totalQuantity: g._sum.quantity ?? new Prisma.Decimal(0),
          totalRevenue: g._sum.subtotal ?? new Prisma.Decimal(0),
        };
      }),
      total,
    };
  }

  // ==================== 5) Branches Report ====================

  private buildBranchOrdersWhere(query: BranchesReportQuery): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};
    if (query.from !== undefined || query.to !== undefined) {
      where.receivedAt = {
        ...(query.from !== undefined ? { gte: query.from } : {}),
        ...(query.to !== undefined ? { lte: query.to } : {}),
      };
    }
    return where;
  }

  /**
   * تجميع بالذاكرة عمداً - عدد الفروع صغير دائماً بطبيعته (منشأة واحدة بفروع
   * محدودة)، وPayment لا يملك branchId مباشراً (فقط عبر order.branchId) فلا
   * يمكن استخدام groupBy واحدة موحّدة لكل المقاييس الأربعة بلا SQL Raw.
   */
  async branchesUsage(query: BranchesReportQuery, skip: number, take: number) {
    const orderWhere = this.buildBranchOrdersWhere(query);

    const [branchesCount, orders] = await Promise.all([
      this.db.branch.count(),
      this.db.order.findMany({
        where: orderWhere,
        select: { id: true, branchId: true, customerId: true, status: true, total: true },
      }),
    ]);

    const orderIds = orders.map((o) => o.id);
    const payments =
      orderIds.length > 0
        ? await this.db.payment.findMany({
            where: { orderId: { in: orderIds } },
            select: { orderId: true },
          })
        : [];
    const orderById = new Map(orders.map((o) => [o.id, o]));

    interface BranchAgg {
      revenue: Prisma.Decimal;
      ordersCount: number;
      customerIds: Set<string>;
      paymentsCount: number;
    }
    const perBranch = new Map<string, BranchAgg>();
    const ensure = (branchId: string): BranchAgg => {
      let entry = perBranch.get(branchId);
      if (!entry) {
        entry = { revenue: new Prisma.Decimal(0), ordersCount: 0, customerIds: new Set(), paymentsCount: 0 };
        perBranch.set(branchId, entry);
      }
      return entry;
    };

    for (const order of orders) {
      const entry = ensure(order.branchId);
      entry.ordersCount += 1;
      entry.customerIds.add(order.customerId);
      if (order.status !== "CANCELLED") entry.revenue = entry.revenue.add(order.total);
    }
    for (const payment of payments) {
      const order = orderById.get(payment.orderId);
      if (order) ensure(order.branchId).paymentsCount += 1;
    }

    const branches = await this.db.branch.findMany();
    const merged = branches.map((b) => {
      const entry = perBranch.get(b.id);
      return {
        id: b.id,
        name: b.name,
        isActive: b.isActive,
        revenue: entry?.revenue ?? new Prisma.Decimal(0),
        ordersCount: entry?.ordersCount ?? 0,
        customersCount: entry?.customerIds.size ?? 0,
        paymentsCount: entry?.paymentsCount ?? 0,
      };
    });

    const sorted = merged.sort((a, b) => {
      const valueOf = (row: (typeof merged)[number]) =>
        query.sortBy === "revenue"
          ? Number(row.revenue)
          : query.sortBy === "ordersCount"
            ? row.ordersCount
            : row.customersCount;
      const diff = valueOf(a) - valueOf(b);
      return query.sortOrder === "asc" ? diff : -diff;
    });

    return { rows: sorted.slice(skip, skip + take), total: branchesCount };
  }

  // ==================== 6) Employees Report ====================

  private buildEmployeeOrdersWhere(query: EmployeesReportQuery): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};
    if (query.from !== undefined || query.to !== undefined) {
      where.receivedAt = {
        ...(query.from !== undefined ? { gte: query.from } : {}),
        ...(query.to !== undefined ? { lte: query.to } : {}),
      };
    }
    if (query.branchId !== undefined) where.branchId = query.branchId;
    return where;
  }

  /**
   * تجميع بالذاكرة عمداً - orders.createdById وpayments.receivedById كلاهما
   * User لكن بجدولين مختلفين، لا علاقة Prisma واحدة تجمعهما دفعة واحدة.
   */
  async employeesUsage(query: EmployeesReportQuery, skip: number, take: number) {
    const orderWhere = this.buildEmployeeOrdersWhere(query);
    const orders = await this.db.order.findMany({
      where: orderWhere,
      select: { id: true, createdById: true },
    });
    const orderIds = orders.map((o) => o.id);

    const payments =
      orderIds.length > 0
        ? await this.db.payment.findMany({
            where: { orderId: { in: orderIds } },
            select: { receivedById: true, amount: true },
          })
        : [];

    interface EmployeeAgg {
      ordersCreatedCount: number;
      paymentsProcessedCount: number;
      paymentsProcessedAmount: Prisma.Decimal;
    }
    const perUser = new Map<string, EmployeeAgg>();
    const ensure = (userId: string): EmployeeAgg => {
      let entry = perUser.get(userId);
      if (!entry) {
        entry = { ordersCreatedCount: 0, paymentsProcessedCount: 0, paymentsProcessedAmount: new Prisma.Decimal(0) };
        perUser.set(userId, entry);
      }
      return entry;
    };

    for (const order of orders) ensure(order.createdById).ordersCreatedCount += 1;
    for (const payment of payments) {
      const entry = ensure(payment.receivedById);
      entry.paymentsProcessedCount += 1;
      entry.paymentsProcessedAmount = entry.paymentsProcessedAmount.add(payment.amount);
    }

    const userIds = [...perUser.keys()];
    if (userIds.length === 0) return { rows: [], total: 0 };

    const users = await this.db.user.findMany({ where: { id: { in: userIds } } });
    const merged = users.map((u) => {
      const entry = perUser.get(u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        ordersCreatedCount: entry?.ordersCreatedCount ?? 0,
        paymentsProcessedCount: entry?.paymentsProcessedCount ?? 0,
        paymentsProcessedAmount: entry?.paymentsProcessedAmount ?? new Prisma.Decimal(0),
      };
    });

    const sorted = merged.sort((a, b) => {
      const valueOf = (row: (typeof merged)[number]) =>
        query.sortBy === "ordersCreatedCount" ? row.ordersCreatedCount : Number(row.paymentsProcessedAmount);
      const diff = valueOf(a) - valueOf(b);
      return query.sortOrder === "asc" ? diff : -diff;
    });

    return { rows: sorted.slice(skip, skip + take), total: merged.length };
  }

  // ==================== Phase 7: Inventory Reports (قراءة فقط، عابر للوحدات) ====================

  async inventoryReportList(f: InventoryReportFilters, skip: number, take: number) {
    const where: Prisma.InventoryItemWhereInput = {};
    if (f.type) where.type = f.type;
    if (f.supplierId) where.supplierId = f.supplierId;
    if (f.isActive !== undefined) where.isActive = f.isActive;
    const [rows, total] = await Promise.all([
      this.db.inventoryItem.findMany({
        where,
        orderBy: { [f.sortBy]: f.sortOrder },
        skip,
        take,
        include: { supplier: { select: { name: true } } },
      }),
      this.db.inventoryItem.count({ where }),
    ]);
    return { rows, total };
  }

  async inventoryReportSummary(f: InventoryReportFilters) {
    const where: Prisma.InventoryItemWhereInput = {};
    if (f.type) where.type = f.type;
    if (f.supplierId) where.supplierId = f.supplierId;
    if (f.isActive !== undefined) where.isActive = f.isActive;
    const [totalItems, agg] = await Promise.all([
      this.db.inventoryItem.count({ where }),
      this.db.inventoryItem.aggregate({ where, _sum: { quantity: true } }),
    ]);
    return { totalItems, totalQuantity: agg._sum.quantity ?? new Prisma.Decimal(0) };
  }

  async movementsReportList(f: MovementsReportFilters, skip: number, take: number) {
    const where: Prisma.InventoryTransactionWhereInput = {};
    if (f.itemId) where.itemId = f.itemId;
    if (f.type) where.type = f.type;
    if (f.from || f.to) {
      where.createdAt = { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) };
    }
    const [rows, total] = await Promise.all([
      this.db.inventoryTransaction.findMany({
        where,
        orderBy: { [f.sortBy]: f.sortOrder },
        skip,
        take,
        include: { item: { select: { name: true, sku: true } } },
      }),
      this.db.inventoryTransaction.count({ where }),
    ]);
    return { rows, total };
  }

  async suppliersReportList(f: SuppliersReportFilters, skip: number, take: number) {
    const where: Prisma.SupplierWhereInput = {};
    if (f.isActive !== undefined) where.isActive = f.isActive;
    const [suppliers, total] = await Promise.all([
      this.db.supplier.findMany({ where, orderBy: { [f.sortBy]: f.sortOrder }, skip, take }),
      this.db.supplier.count({ where }),
    ]);
    // تجميع مشتريات كل مورّد دفعة واحدة (بلا N+1)
    const ids = suppliers.map((s) => s.id);
    const grouped =
      ids.length > 0
        ? await this.db.purchase.groupBy({
            by: ["supplierId"],
            where: { supplierId: { in: ids }, status: "RECEIVED" },
            _count: { _all: true },
            _sum: { total: true },
          })
        : [];
    const map = new Map(grouped.map((g) => [g.supplierId, g]));
    const rows = suppliers.map((s) => {
      const g = map.get(s.id);
      return {
        ...s,
        purchasesCount: g?._count._all ?? 0,
        totalSpent: g?._sum.total ?? new Prisma.Decimal(0),
      };
    });
    return { rows, total };
  }

  async purchasesReportList(f: PurchasesReportFilters, skip: number, take: number) {
    const where: Prisma.PurchaseWhereInput = {};
    if (f.status) where.status = f.status;
    if (f.supplierId) where.supplierId = f.supplierId;
    if (f.from || f.to) {
      where.createdAt = { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) };
    }
    const [rows, total] = await Promise.all([
      this.db.purchase.findMany({
        where,
        orderBy: { [f.sortBy]: f.sortOrder },
        skip,
        take,
        include: { supplier: { select: { name: true } }, _count: { select: { items: true } } },
      }),
      this.db.purchase.count({ where }),
    ]);
    return { rows, total };
  }

  async purchasesReportSummary(f: PurchasesReportFilters) {
    const where: Prisma.PurchaseWhereInput = {};
    if (f.status) where.status = f.status;
    if (f.supplierId) where.supplierId = f.supplierId;
    if (f.from || f.to) {
      where.createdAt = { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) };
    }
    const [count, agg] = await Promise.all([
      this.db.purchase.count({ where }),
      this.db.purchase.aggregate({ where, _sum: { total: true, tax: true } }),
    ]);
    return {
      totalPurchases: count,
      totalAmount: agg._sum.total ?? new Prisma.Decimal(0),
      totalTax: agg._sum.tax ?? new Prisma.Decimal(0),
    };
  }

  /** تقرير قيمة المخزون - يُرتَّب بالكمية ثم تُحسب القيمة في طبقة العرض */
  async stockValueReportList(f: StockValueReportFilters, skip: number, take: number) {
    const where: Prisma.InventoryItemWhereInput = { isActive: true };
    if (f.type) where.type = f.type;
    const [rows, total] = await Promise.all([
      this.db.inventoryItem.findMany({
        where,
        orderBy: { [f.sortBy]: f.sortOrder },
        skip,
        take,
      }),
      this.db.inventoryItem.count({ where }),
    ]);
    return { rows, total };
  }

  async stockValueReportSummary(f: StockValueReportFilters) {
    const where = f.type ? `AND "type" = '${f.type}'` : "";
    const rows = await this.db.$queryRawUnsafe<{ value: string | null; qty: string | null }[]>(
      `SELECT COALESCE(SUM("quantity" * "costPrice"),0)::text AS value, COALESCE(SUM("quantity"),0)::text AS qty
       FROM "inventory_items" WHERE "isActive" = true ${where}`,
    );
    return {
      totalValue: Number(rows[0]?.value ?? 0),
      totalQuantity: Number(rows[0]?.qty ?? 0),
    };
  }

  // ==================== Phase 8: Barcode Reports ====================

  /** الأكثر مسحاً - تجميع سجلّ المسح الناجح حسب الصنف (بلا N+1) */
  async mostScannedReport(skip: number, take: number) {
    const grouped = await this.db.barcodeScanLog.groupBy({
      by: ["itemId"],
      where: { success: true, itemId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { itemId: "desc" } },
      skip,
      take,
    });
    const totalGroups = await this.db.barcodeScanLog.findMany({
      where: { success: true, itemId: { not: null } },
      distinct: ["itemId"],
      select: { itemId: true },
    });
    const ids = grouped.map((g) => g.itemId).filter((x): x is string => x !== null);
    const items = await this.db.inventoryItem.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, sku: true, barcode: true },
    });
    const map = new Map(items.map((i) => [i.id, i]));
    const rows = grouped.map((g) => {
      const it = g.itemId ? map.get(g.itemId) : undefined;
      return {
        itemId: g.itemId,
        name: it?.name ?? "—",
        sku: it?.sku ?? "—",
        barcode: it?.barcode ?? null,
        scanCount: g._count._all,
      };
    });
    return { rows, total: totalGroups.length };
  }

  async printHistoryReport(skip: number, take: number) {
    const [rows, total] = await Promise.all([
      this.db.labelPrintLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { item: { select: { name: true, sku: true } } },
      }),
      this.db.labelPrintLog.count(),
    ]);
    return { rows, total };
  }

  async missingBarcodeReport(skip: number, take: number) {
    const where = { barcode: null, isActive: true } as const;
    const [rows, total] = await Promise.all([
      this.db.inventoryItem.findMany({ where, orderBy: { name: "asc" }, skip, take }),
      this.db.inventoryItem.count({ where }),
    ]);
    return { rows, total };
  }

  async unusedBarcodeReport(skip: number, take: number) {
    const where = { barcode: { not: null }, printCount: 0 } as const;
    const [rows, total] = await Promise.all([
      this.db.inventoryItem.findMany({ where, orderBy: { name: "asc" }, skip, take }),
      this.db.inventoryItem.count({ where }),
    ]);
    return { rows, total };
  }

  /** كل الأصناف التي لها باركود - التحقّق من الصلاحية يتم بطبقة أعلى (codec) */
  itemsWithBarcode() {
    return this.db.inventoryItem.findMany({
      where: { barcode: { not: null } },
      orderBy: { name: "asc" },
    });
  }

  // ==================== Phase 9: Loyalty / Coupons / Membership Reports ====================

  async topCustomersLoyaltyReport(skip: number, take: number) {
    const [rows, total] = await Promise.all([
      this.db.loyaltyAccount.findMany({
        orderBy: { lifetimePoints: "desc" },
        skip,
        take,
        include: { customer: { select: { name: true, phone: true } } },
      }),
      this.db.loyaltyAccount.count(),
    ]);
    return { rows, total };
  }

  async pointsBalanceReport(skip: number, take: number) {
    const [rows, total] = await Promise.all([
      this.db.loyaltyAccount.findMany({
        orderBy: { currentPoints: "desc" },
        skip,
        take,
        include: { customer: { select: { name: true, phone: true } } },
      }),
      this.db.loyaltyAccount.count(),
    ]);
    return { rows, total };
  }

  async pointsHistoryReport(skip: number, take: number, type?: "EXPIRE" | "REFERRAL") {
    const where = type ? { type } : {};
    const [rows, total] = await Promise.all([
      this.db.loyaltyTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { customer: { select: { name: true } } },
      }),
      this.db.loyaltyTransaction.count({ where }),
    ]);
    return { rows, total };
  }

  async couponUsageReport(skip: number, take: number) {
    const [rows, total] = await Promise.all([
      this.db.couponRedemption.findMany({
        where: { reversed: false },
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          coupon: { select: { code: true, type: true } },
          customer: { select: { name: true } },
        },
      }),
      this.db.couponRedemption.count({ where: { reversed: false } }),
    ]);
    return { rows, total };
  }

  async couponPerformanceReport(skip: number, take: number) {
    const coupons = await this.db.coupon.findMany({ orderBy: { usedCount: "desc" }, skip, take });
    const total = await this.db.coupon.count();
    const ids = coupons.map((c) => c.id);
    const grouped =
      ids.length > 0
        ? await this.db.couponRedemption.groupBy({
            by: ["couponId"],
            where: { couponId: { in: ids }, reversed: false },
            _sum: { discountAmount: true },
            _count: { _all: true },
          })
        : [];
    const map = new Map(grouped.map((g) => [g.couponId, g]));
    const rows = coupons.map((c) => {
      const g = map.get(c.id);
      return {
        ...c,
        redemptions: g?._count._all ?? 0,
        totalDiscount: g?._sum.discountAmount ?? new Prisma.Decimal(0),
      };
    });
    return { rows, total };
  }

  async membershipDistributionReport() {
    const grouped = await this.db.loyaltyAccount.groupBy({
      by: ["membershipLevel"],
      _count: { _all: true },
      _sum: { lifetimePoints: true },
    });
    return grouped.map((g) => ({
      level: g.membershipLevel,
      count: g._count._all,
      totalLifetimePoints: g._sum.lifetimePoints ?? 0,
    }));
  }

  // ==================== Phase 9.5: تقرير إغلاق اليوم ====================

  async dayClosingsList(filters: DayClosingsReportFilters, skip: number, take: number) {
    const where: Prisma.DayClosingWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.businessDate = {};
      if (filters.from) where.businessDate.gte = filters.from;
      if (filters.to) where.businessDate.lte = filters.to;
    }
    const [rows, total] = await Promise.all([
      this.db.dayClosing.findMany({
        where,
        orderBy: { businessDate: filters.sortOrder },
        skip,
        take,
      }),
      this.db.dayClosing.count({ where }),
    ]);
    return { rows, total };
  }

  // ==================== Phase 9.6e: HR + Security/Audit reports ====================

  async attendanceReport(filters: AttendanceReportFilters, skip: number, take: number) {
    const where: Prisma.AttendanceRecordWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.workDate = {};
      if (filters.from) where.workDate.gte = filters.from;
      if (filters.to) where.workDate.lte = filters.to;
    }
    const [rows, total] = await Promise.all([
      this.db.attendanceRecord.findMany({
        where,
        include: { employee: { select: { user: { select: { name: true } } } } },
        orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
      this.db.attendanceRecord.count({ where }),
    ]);
    return { rows, total };
  }

  async payrollReport(skip: number, take: number) {
    const [rows, total] = await Promise.all([
      this.db.payslip.findMany({
        include: {
          employee: { select: { user: { select: { name: true } } } },
          run: { select: { label: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.db.payslip.count(),
    ]);
    return { rows, total };
  }

  async auditReport(filters: AuditReportFilters, actions: readonly AuditAction[] | null, skip: number, take: number) {
    const where: Prisma.AuditLogWhereInput = {};
    if (filters.action) where.action = filters.action as AuditAction;
    else if (actions) where.action = { in: [...actions] };
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }
    const [rows, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.db.auditLog.count({ where }),
    ]);
    return { rows, total };
  }
}

export interface DayClosingsReportFilters {
  status?: "OPEN" | "CLOSED" | "REOPENED";
  from?: Date;
  to?: Date;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

// ==================== فلاتر تقارير المخزون (مشتركة بين القراءة والتصدير) ====================

export interface InventoryReportFilters {
  type?: "PRODUCT" | "RAW_MATERIAL";
  supplierId?: string;
  isActive?: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
}
export interface MovementsReportFilters {
  itemId?: string;
  type?: "IN" | "OUT" | "RETURN" | "ADJUSTMENT" | "LOSS" | "TRANSFER" | "OPENING" | "CLOSING";
  from?: Date;
  to?: Date;
  sortBy: string;
  sortOrder: "asc" | "desc";
}
export interface SuppliersReportFilters {
  isActive?: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
}
export interface PurchasesReportFilters {
  status?: "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";
  supplierId?: string;
  from?: Date;
  to?: Date;
  sortBy: string;
  sortOrder: "asc" | "desc";
}
export interface StockValueReportFilters {
  type?: "PRODUCT" | "RAW_MATERIAL";
  sortBy: string;
  sortOrder: "asc" | "desc";
}

// ==================== Phase 9.6e: HR + Security/Audit report filters ====================

export interface AttendanceReportFilters {
  from?: Date;
  to?: Date;
  status?: "PRESENT" | "LATE" | "ABSENT" | "ON_LEAVE" | "HALF_DAY";
}
export interface AuditReportFilters {
  from?: Date;
  to?: Date;
  action?: string;
}
