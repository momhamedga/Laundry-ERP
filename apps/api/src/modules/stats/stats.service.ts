import type { RevenueRow, StatsRepository } from "./stats.repository.js";
import type { DashboardStats } from "./stats.types.js";

/** بداية اليوم المحلي للخادم */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function daysAgo(days: number): Date {
  const start = startOfToday();
  start.setDate(start.getDate() - days);
  return start;
}

/** yyyy-mm-dd بالتوقيت المحلي */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** صافي إيراد مجموعة مدفوعات */
function netRevenue(rows: readonly RevenueRow[]): number {
  return rows.reduce((sum, r) => sum + Number(r.amount) - Number(r.refundedAmount), 0);
}

export class StatsService {
  constructor(private readonly repo: StatsRepository) {}

  /**
   * كل أرقام لوحة التحكم بضربة واحدة - تُحسب من القاعدة مباشرة
   * (الاستردادات تُخصم على تاريخ الدفعة الأصلية - تقريب مقبول للوحة)
   */
  async dashboard(branchId?: string): Promise<DashboardStats> {
    const today = startOfToday();
    const now = new Date();
    const weekAgo = daysAgo(6); // اليوم + 6 أيام سابقة = 7

    const [
      todayOrders,
      newCustomers,
      activeOrders,
      readyForDelivery,
      overdueOrders,
      unpaid,
      byStatus,
      monthRevenueRows,
      weekRevenueRows,
    ] = await Promise.all([
      this.repo.countOrdersSince(today, branchId),
      this.repo.countNewCustomersSince(today),
      this.repo.countActiveOrders(branchId),
      this.repo.countOrdersByStatus("READY", branchId),
      this.repo.countOverdueOrders(now, branchId),
      this.repo.unpaidBalance(branchId),
      this.repo.ordersByStatus(branchId),
      this.repo.findRevenueRowsSince(startOfMonth(), branchId),
      this.repo.findRevenueRowsSince(weekAgo, branchId),
    ]);

    // تجميع إيراد آخر 7 أيام يوماً بيوم (أيام بلا مدفوعات = 0)
    const byDay = new Map<string, number>();
    for (let i = 6; i >= 0; i--) byDay.set(dateKey(daysAgo(i)), 0);
    for (const row of weekRevenueRows) {
      const key = dateKey(row.createdAt);
      if (byDay.has(key)) {
        byDay.set(
          key,
          (byDay.get(key) ?? 0) + Number(row.amount) - Number(row.refundedAmount),
        );
      }
    }

    const todayRevenue = byDay.get(dateKey(today)) ?? 0;

    return {
      today: {
        orders: todayOrders,
        revenue: Number(todayRevenue.toFixed(2)),
        newCustomers,
      },
      operations: { activeOrders, readyForDelivery, overdueOrders },
      financial: {
        unpaidBalance: Number(Number(unpaid ?? 0).toFixed(2)),
        revenueThisMonth: Number(netRevenue(monthRevenueRows).toFixed(2)),
      },
      ordersByStatus: byStatus,
      revenueLast7Days: [...byDay.entries()].map(([date, revenue]) => ({
        date,
        revenue: Number(revenue.toFixed(2)),
      })),
    };
  }
}
