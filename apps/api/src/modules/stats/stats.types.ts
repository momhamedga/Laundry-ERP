import type { OrderStatus } from "@prisma/client";

/** أرقام لوحة التحكم الرئيسية - تُحسب من القاعدة مباشرة */
export interface DashboardStats {
  /** أرقام اليوم الحالي */
  today: {
    orders: number;
    /** صافي المحصل اليوم (مدفوعات مكتملة - استردادات) */
    revenue: number;
    newCustomers: number;
  };
  /** الحالة التشغيلية الآن */
  operations: {
    activeOrders: number;
    readyForDelivery: number;
    /** طلبات تجاوزت موعد تسليمها ولم تُسلَّم */
    overdueOrders: number;
  };
  /** المالية */
  financial: {
    /** إجمالي المستحق غير المحصل (طلبات غير ملغاة) */
    unpaidBalance: number;
    revenueThisMonth: number;
  };
  /** توزيع الطلبات على الحالات */
  ordersByStatus: { status: OrderStatus; count: number }[];
  /** إيراد آخر 7 أيام للرسم البياني */
  revenueLast7Days: { date: string; revenue: number }[];
}
