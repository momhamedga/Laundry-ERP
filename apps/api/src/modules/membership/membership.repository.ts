import type {
  AuditAction,
  MembershipLevel,
  MembershipTierConfig,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { DEFAULT_TIERS } from "./membership.constants.js";

export class MembershipRepository {
  constructor(private readonly db: PrismaClient) {}

  /** يضمن وجود المستويات الخمسة بالقيم الافتراضية (idempotent) */
  async ensureTiers(): Promise<MembershipTierConfig[]> {
    const count = await this.db.membershipTierConfig.count();
    if (count === 0) {
      await this.db.membershipTierConfig.createMany({ data: DEFAULT_TIERS });
    }
    return this.db.membershipTierConfig.findMany({ orderBy: { sortOrder: "asc" } });
  }

  listTiers(): Promise<MembershipTierConfig[]> {
    return this.db.membershipTierConfig.findMany({ orderBy: { sortOrder: "asc" } });
  }

  findTierByLevel(level: MembershipLevel): Promise<MembershipTierConfig | null> {
    return this.db.membershipTierConfig.findUnique({ where: { level } });
  }

  updateTier(level: MembershipLevel, data: Prisma.MembershipTierConfigUpdateInput): Promise<MembershipTierConfig> {
    return this.db.membershipTierConfig.update({ where: { level }, data });
  }

  // ==================== Loyalty account level (عمود العضوية فقط) ====================

  findAccountByCustomer(customerId: string) {
    return this.db.loyaltyAccount.findUnique({ where: { customerId } });
  }

  updateAccountLevel(customerId: string, level: MembershipLevel): Promise<unknown> {
    return this.db.loyaltyAccount.update({
      where: { customerId },
      data: { membershipLevel: level, levelSince: new Date() },
    });
  }

  /** توزيع الأعضاء حسب المستوى (بلا N+1) */
  async distribution(): Promise<{ level: MembershipLevel; count: number }[]> {
    const grouped = await this.db.loyaltyAccount.groupBy({
      by: ["membershipLevel"],
      _count: { _all: true },
    });
    return grouped.map((g) => ({ level: g.membershipLevel, count: g._count._all }));
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
}
