import type {
  AuditAction,
  Campaign,
  LoyaltyAccount,
  LoyaltySettings,
  LoyaltyTransaction,
  LoyaltyTxSource,
  LoyaltyTxType,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type {
  HistoryQuery,
  ListAccountsQuery,
  ListCampaignsQuery,
} from "./loyalty.dto.js";
import type {
  ListAccountsResult,
  ListCampaignsResult,
  ListHistoryResult,
} from "./loyalty.types.js";

const SETTINGS_ID = "singleton";

export interface LedgerInput {
  customerId: string;
  type: LoyaltyTxType;
  source: LoyaltyTxSource;
  signedPoints: number;
  lifetimeDelta?: number;
  redeemedDelta?: number;
  expiredDelta?: number;
  orderId?: string | null;
  reference?: string | null;
  note?: string | null;
  expiresAt?: Date | null;
  createdById?: string | null;
}

export class LoyaltyRepository {
  constructor(private readonly db: PrismaClient) {}

  // ==================== Account ====================

  async getOrCreateAccount(customerId: string): Promise<LoyaltyAccount> {
    const existing = await this.db.loyaltyAccount.findUnique({ where: { customerId } });
    if (existing) return existing;
    return this.db.loyaltyAccount.create({ data: { customerId } });
  }

  findAccountWithCustomer(customerId: string) {
    return this.db.loyaltyAccount.findUnique({
      where: { customerId },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
  }

  /**
   * كتابة حركة نقاط + تحديث الحساب في معاملة ذرّية واحدة. يمنع الرصيد السالب.
   * كل عمليات النقاط (earn/redeem/reverse/expire/adjust/bonus) تمرّ من هنا - صفر تكرار.
   */
  applyLedger(input: LedgerInput): Promise<{ account: LoyaltyAccount; transaction: LoyaltyTransaction }> {
    return this.db.$transaction(async (tx) => {
      let account = await tx.loyaltyAccount.findUnique({ where: { customerId: input.customerId } });
      account ??= await tx.loyaltyAccount.create({ data: { customerId: input.customerId } });

      const newCurrent = account.currentPoints + input.signedPoints;
      if (newCurrent < 0) throw new ApiError(400, "رصيد النقاط غير كافٍ.");

      const updated = await tx.loyaltyAccount.update({
        where: { customerId: input.customerId },
        data: {
          currentPoints: newCurrent,
          lifetimePoints: account.lifetimePoints + (input.lifetimeDelta ?? 0),
          redeemedPoints: account.redeemedPoints + (input.redeemedDelta ?? 0),
          expiredPoints: account.expiredPoints + (input.expiredDelta ?? 0),
        },
      });
      const transaction = await tx.loyaltyTransaction.create({
        data: {
          customerId: input.customerId,
          type: input.type,
          source: input.source,
          points: input.signedPoints,
          balanceAfter: newCurrent,
          orderId: input.orderId ?? null,
          reference: input.reference ?? null,
          note: input.note ?? null,
          expiresAt: input.expiresAt ?? null,
          createdById: input.createdById ?? null,
        },
      });
      return { account: updated, transaction };
    });
  }

  async listAccounts(query: ListAccountsQuery): Promise<ListAccountsResult> {
    const where: Prisma.LoyaltyAccountWhereInput = {};
    if (query.level) where.membershipLevel = query.level;
    if (query.search) {
      where.customer = {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search } },
        ],
      };
    }
    const skip = (query.page - 1) * query.limit;
    const [accounts, total] = await this.db.$transaction([
      this.db.loyaltyAccount.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take: query.limit,
        include: { customer: { select: { id: true, name: true, phone: true } } },
      }),
      this.db.loyaltyAccount.count({ where }),
    ]);
    return { accounts, meta: this.meta(query.page, query.limit, total) };
  }

  // ==================== Transactions / History ====================

  findEarnTxForOrder(orderId: string): Promise<LoyaltyTransaction | null> {
    return this.db.loyaltyTransaction.findFirst({
      where: { orderId, type: "EARN", reversed: false },
    });
  }

  findRedeemTxForOrder(orderId: string): Promise<LoyaltyTransaction[]> {
    return this.db.loyaltyTransaction.findMany({
      where: { orderId, type: "REDEEM", reversed: false },
    });
  }

  markReversed(txId: string): Promise<unknown> {
    return this.db.loyaltyTransaction.update({ where: { id: txId }, data: { reversed: true } });
  }

  async listHistory(query: HistoryQuery): Promise<ListHistoryResult> {
    const where: Prisma.LoyaltyTransactionWhereInput = {};
    if (query.customerId) where.customerId = query.customerId;
    if (query.type) where.type = query.type;
    const skip = (query.page - 1) * query.limit;
    const [transactions, total] = await this.db.$transaction([
      this.db.loyaltyTransaction.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take: query.limit,
        include: { customer: { select: { id: true, name: true } } },
      }),
      this.db.loyaltyTransaction.count({ where }),
    ]);
    return { transactions, meta: this.meta(query.page, query.limit, total) };
  }

  /** نقاط EARN المنتهية صلاحيتها ولم تُعكس/تنتهِ بعد - لوظيفة الانتهاء */
  findExpirablePoints(now: Date, take: number) {
    return this.db.loyaltyTransaction.findMany({
      where: { type: "EARN", reversed: false, expiresAt: { not: null, lte: now } },
      take,
      orderBy: { expiresAt: "asc" },
    });
  }

  // ==================== Settings ====================

  async getOrCreateSettings(): Promise<LoyaltySettings> {
    const existing = await this.db.loyaltySettings.findUnique({ where: { id: SETTINGS_ID } });
    if (existing) return existing;
    return this.db.loyaltySettings.create({ data: { id: SETTINGS_ID } });
  }

  updateSettings(data: Prisma.LoyaltySettingsUpdateInput): Promise<LoyaltySettings> {
    return this.db.loyaltySettings.update({ where: { id: SETTINGS_ID }, data });
  }

  // ==================== Campaigns ====================

  createCampaign(data: Prisma.CampaignUncheckedCreateInput): Promise<Campaign> {
    return this.db.campaign.create({ data });
  }
  findCampaign(id: string): Promise<Campaign | null> {
    return this.db.campaign.findUnique({ where: { id } });
  }
  updateCampaign(id: string, data: Prisma.CampaignUpdateInput): Promise<Campaign> {
    return this.db.campaign.update({ where: { id }, data });
  }
  deleteCampaign(id: string): Promise<Campaign> {
    return this.db.campaign.delete({ where: { id } });
  }
  async listCampaigns(query: ListCampaignsQuery): Promise<ListCampaignsResult> {
    const skip = (query.page - 1) * query.limit;
    const [campaigns, total] = await this.db.$transaction([
      this.db.campaign.findMany({ orderBy: { [query.sortBy]: query.sortOrder }, skip, take: query.limit }),
      this.db.campaign.count(),
    ]);
    return { campaigns, meta: this.meta(query.page, query.limit, total) };
  }

  // ==================== Cross-module read (order) - نمط reports/backup ====================

  readOrderForEarn(orderId: string) {
    return this.db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        customerId: true,
        customer: { select: { name: true } },
      },
    });
  }

  // ==================== Stats ====================

  async getStats() {
    const [totalAccounts, agg] = await Promise.all([
      this.db.loyaltyAccount.count(),
      this.db.loyaltyAccount.aggregate({
        _sum: { currentPoints: true, lifetimePoints: true, redeemedPoints: true, expiredPoints: true },
      }),
    ]);
    return {
      totalAccounts,
      totalCurrentPoints: agg._sum.currentPoints ?? 0,
      totalLifetimePoints: agg._sum.lifetimePoints ?? 0,
      totalRedeemedPoints: agg._sum.redeemedPoints ?? 0,
      totalExpiredPoints: agg._sum.expiredPoints ?? 0,
    };
  }

  createAuditLog(entry: {
    action: AuditAction;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Prisma.InputJsonValue;
  }): Promise<unknown> {
    return this.db.auditLog.create({ data: entry });
  }

  private meta(page: number, limit: number, total: number) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
  }
}
