export type DayStatus = "OPEN" | "CLOSED" | "REOPENED";
export type PaymentMethodKey = "CASH" | "CARD" | "BANK_TRANSFER" | "MOBILE_WALLET";

export interface DayAggregations {
  ordersCount: number;
  ordersByStatus: Record<string, number>;
  ordersSubtotal: number;
  ordersDiscount: number;
  ordersTotal: number;
  paymentsCount: number;
  totalRevenue: number;
  paymentsByMethod: Record<PaymentMethodKey, number>;
  cashSales: number;
  cardSales: number;
  bankSales: number;
  walletSales: number;
  refundsTotal: number;
  invoicesCount: number;
  invoicesTotal: number;
  taxTotal: number;
  discountTotal: number;
  netSales: number;
  newCustomers: number;
  purchasesCount: number;
  purchasesTotal: number;
  inventoryValue: number;
  inventoryMovements: number;
  pointsEarned: number;
  pointsRedeemed: number;
  couponsUsed: number;
  employeesWorked: number;
  overtimeHours: number;
  lowStockAlerts: number;
  outOfStockAlerts: number;
}

export type PreCloseSeverity = "blocking" | "warning" | "info";

export interface PreCloseCheckItem {
  key: string;
  label: string;
  severity: PreCloseSeverity;
  count: number;
}

export interface PreCloseCheckResult {
  ready: boolean;
  hasBlocking: boolean;
  hasWarnings: boolean;
  items: PreCloseCheckItem[];
}

export interface DayCashSummary {
  openingCash: number;
  cashIn: number;
  cashOut: number;
  cashSales: number;
  expectedCash: number;
  actualCash: number | null;
  cashDifference: number | null;
}

export interface DayClosingView {
  id: string;
  branchId: string | null;
  businessDate: string;
  status: DayStatus;
  openingCash: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  actualCash: number | null;
  cashDifference: number | null;
  differenceNote: string | null;
  snapshot: DayAggregations | null;
  openedAt: string;
  openedById: string | null;
  closedAt: string | null;
  closedById: string | null;
  reopenedAt: string | null;
  reopenedById: string | null;
  reopenReason: string | null;
  approvedAt: string | null;
  approvedById: string | null;
  lockedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DayClosingDashboard {
  current: DayClosingView | null;
  live: DayAggregations | null;
  cash: DayCashSummary | null;
  recent: DayClosingView[];
  stats: {
    openDays: number;
    closedDays: number;
    totalClosings: number;
    lastClosedAt: string | null;
  };
}

export interface OpenDayInput {
  openingCash?: number;
  notes?: string;
}

export interface CloseDayInput {
  actualCash: number;
  cashIn?: number;
  cashOut?: number;
  differenceNote?: string;
  notes?: string;
  force?: boolean;
}

export interface CashMovementInput {
  type: "IN" | "OUT";
  amount: number;
  note?: string;
}

export interface ListDayClosingsParams {
  page?: number;
  limit?: number;
  status?: DayStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
