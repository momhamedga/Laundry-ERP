import type {
  Campaign,
  LoyaltyAccount,
  LoyaltySettings,
  LoyaltyTransaction,
} from "@prisma/client";

export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** ملخّص حساب العميل - كل الأرصدة المطلوبة */
export interface AccountSummary {
  customerId: string;
  customerName: string;
  currentPoints: number;
  lifetimePoints: number;
  redeemedPoints: number;
  expiredPoints: number;
  pendingPoints: number;
  availablePoints: number;
  membershipLevel: string;
  levelSince: Date;
}

export type AccountWithCustomer = LoyaltyAccount & {
  customer: { id: string; name: string; phone: string };
};

export interface ListAccountsResult {
  accounts: AccountWithCustomer[];
  meta: PaginationMeta;
}

export type TxWithCustomer = LoyaltyTransaction & {
  customer: { id: string; name: string };
};

export interface ListHistoryResult {
  transactions: TxWithCustomer[];
  meta: PaginationMeta;
}

export interface ListCampaignsResult {
  campaigns: Campaign[];
  meta: PaginationMeta;
}

export interface RedeemResult {
  discountAmount: number;
  pointsRedeemed: number;
  balanceAfter: number;
}

export interface RedeemQuote {
  points: number;
  discountAmount: number;
  eligible: boolean;
  reason?: string;
}

export interface LoyaltyStats {
  totalAccounts: number;
  totalCurrentPoints: number;
  totalLifetimePoints: number;
  totalRedeemedPoints: number;
  totalExpiredPoints: number;
}

export type { LoyaltyAccount, LoyaltySettings, LoyaltyTransaction, Campaign };
