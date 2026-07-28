import type { OrderStatus } from "@/types/orders";

/** يطابق DashboardStats بالخادم حرفياً - apps/api/src/modules/stats/stats.types.ts */
export interface DashboardStats {
  today: {
    orders: number;
    revenue: number;
    newCustomers: number;
  };
  operations: {
    activeOrders: number;
    readyForDelivery: number;
    overdueOrders: number;
  };
  financial: {
    unpaidBalance: number;
    revenueThisMonth: number;
  };
  ordersByStatus: { status: OrderStatus; count: number }[];
  revenueLast7Days: { date: string; revenue: number }[];
}

export interface DashboardStatsParams {
  branchId?: string;
}
