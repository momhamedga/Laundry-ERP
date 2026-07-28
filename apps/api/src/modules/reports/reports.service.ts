import type {
  BranchesReportQuery,
  CustomersReportQuery,
  EmployeesReportQuery,
  OrdersReportQuery,
  PaymentsReportQuery,
  ServicesReportQuery,
} from "./reports.dto.js";
import type { ReportsRepository } from "./reports.repository.js";
import type {
  BranchesReportResult,
  CustomersReportResult,
  EmployeesReportResult,
  OrdersReportResult,
  PaginationMeta,
  PaymentsReportResult,
  ServicesReportResult,
} from "./reports.types.js";

export class ReportsService {
  constructor(private readonly repository: ReportsRepository) {}

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

  // ==================== 1) Orders Report ====================

  async ordersReport(query: OrdersReportQuery): Promise<OrdersReportResult> {
    const { skip, take } = this.toSkipTake(query.page, query.limit);
    const [summary, list] = await Promise.all([
      this.repository.ordersSummary(query),
      this.repository.ordersList(query, skip, take),
    ]);

    const totalRevenue = Number(summary.totalRevenue);
    const averageOrderValue = summary.nonCancelledCount > 0 ? totalRevenue / summary.nonCancelledCount : 0;

    return {
      summary: {
        totalOrders: summary.totalOrders,
        totalRevenue,
        averageOrderValue,
      },
      orders: list.rows.map((o) => ({
        ...o,
        customerName: o.customer.name,
        branchName: o.branch.name,
      })),
      meta: this.buildPaginationMeta(query.page, query.limit, list.total),
    };
  }

  // ==================== 2) Payments Report ====================

  async paymentsReport(query: PaymentsReportQuery): Promise<PaymentsReportResult> {
    const { skip, take } = this.toSkipTake(query.page, query.limit);
    const [summary, list] = await Promise.all([
      this.repository.paymentsSummary(query),
      this.repository.paymentsList(query, skip, take),
    ]);

    return {
      summary: {
        totalPayments: summary.totalPayments,
        totalAmount: Number(summary.totalAmount),
        refunded: Number(summary.refunded),
        pending: Number(summary.pending),
      },
      payments: list.rows.map((p) => ({
        ...p,
        orderNumber: p.order.orderNumber,
        branchName: p.order.branch.name,
      })),
      meta: this.buildPaginationMeta(query.page, query.limit, list.total),
    };
  }

  // ==================== 3) Customers Report ====================

  async customersReport(query: CustomersReportQuery): Promise<CustomersReportResult> {
    const { skip, take } = this.toSkipTake(query.page, query.limit);
    const [summary, topCustomers, list] = await Promise.all([
      this.repository.customersSummary(query),
      this.repository.topCustomers(query),
      this.repository.customersListWithActivity(query, skip, take),
    ]);

    return {
      summary,
      topCustomers: topCustomers.map((c) => ({ ...c, totalSpent: Number(c.totalSpent) })),
      customers: list.rows.map((c) => ({ ...c, totalSpent: Number(c.totalSpent) })),
      meta: this.buildPaginationMeta(query.page, query.limit, list.total),
    };
  }

  // ==================== 4) Services Report ====================

  async servicesReport(query: ServicesReportQuery): Promise<ServicesReportResult> {
    const { skip, take } = this.toSkipTake(query.page, query.limit);
    const { rows, total } = await this.repository.servicesUsage(query, skip, take);

    return {
      services: rows.map((r) => ({
        ...r,
        totalQuantity: Number(r.totalQuantity),
        totalRevenue: Number(r.totalRevenue),
      })),
      meta: this.buildPaginationMeta(query.page, query.limit, total),
    };
  }

  // ==================== 5) Branches Report ====================

  async branchesReport(query: BranchesReportQuery): Promise<BranchesReportResult> {
    const { skip, take } = this.toSkipTake(query.page, query.limit);
    const { rows, total } = await this.repository.branchesUsage(query, skip, take);

    return {
      branches: rows.map((r) => ({ ...r, revenue: Number(r.revenue) })),
      meta: this.buildPaginationMeta(query.page, query.limit, total),
    };
  }

  // ==================== 6) Employees Report ====================

  async employeesReport(query: EmployeesReportQuery): Promise<EmployeesReportResult> {
    const { skip, take } = this.toSkipTake(query.page, query.limit);
    const { rows, total } = await this.repository.employeesUsage(query, skip, take);

    return {
      employees: rows.map((r) => ({ ...r, paymentsProcessedAmount: Number(r.paymentsProcessedAmount) })),
      meta: this.buildPaginationMeta(query.page, query.limit, total),
    };
  }
}
