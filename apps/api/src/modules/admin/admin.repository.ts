import type {
  AuditAction,
  Prisma,
  PrismaClient,
  RefreshToken,
  UserRole,
} from "@prisma/client";
import { LOGIN_AUDIT_ACTIONS } from "./admin.constants.js";

type SessionWithUser = RefreshToken & {
  user: { name: string; email: string; role: UserRole };
};

type AuditWithUser = {
  id: string;
  action: AuditAction;
  email: string | null;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: { name: string } | null;
};

/**
 * مستودع الإدارة/الأمان - قراءات عابرة للوحدات (users/refresh_tokens/audit_logs)
 * بنفس النمط المُعتمَد، وكتابة محصورة في إبطال الجلسات (revoke) وسجل التدقيق.
 * لا يعدّل نموذج User ولا أي منطق مصادقة قائم.
 */
export class AdminRepository {
  constructor(private readonly db: PrismaClient) {}

  // ==================== Users aggregation ====================

  async userCounts(): Promise<{
    total: number;
    active: number;
    locked: number;
    byRole: Record<UserRole, number>;
  }> {
    const now = new Date();
    const [total, active, locked, byRoleRaw] = await Promise.all([
      this.db.user.count(),
      this.db.user.count({ where: { isActive: true } }),
      this.db.user.count({ where: { lockedUntil: { gt: now } } }),
      this.db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    ]);
    const byRole: Record<UserRole, number> = {
      ADMIN: 0,
      MANAGER: 0,
      CASHIER: 0,
      WORKER: 0,
      DELIVERY: 0,
    };
    for (const r of byRoleRaw) byRole[r.role] = r._count._all;
    return { total, active, locked, byRole };
  }

  // ==================== Sessions ====================

  async sessionStats(): Promise<{ active: number; users: number }> {
    const now = new Date();
    const where: Prisma.RefreshTokenWhereInput = { revokedAt: null, expiresAt: { gt: now } };
    const [active, distinct] = await Promise.all([
      this.db.refreshToken.count({ where }),
      this.db.refreshToken.findMany({ where, distinct: ["userId"], select: { userId: true } }),
    ]);
    return { active, users: distinct.length };
  }

  findUserSessions(userId: string): Promise<SessionWithUser[]> {
    return this.db.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  findSessionById(sessionId: string): Promise<RefreshToken | null> {
    return this.db.refreshToken.findUnique({ where: { id: sessionId } });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.db.refreshToken.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  }

  async revokeByScope(scope: "user" | "branch" | "all", ids: { userId?: string; branchId?: string }): Promise<number> {
    const where: Prisma.RefreshTokenWhereInput = { revokedAt: null };
    if (scope === "user") where.userId = ids.userId;
    else if (scope === "branch") where.user = { branchId: ids.branchId };
    const res = await this.db.refreshToken.updateMany({ where, data: { revokedAt: new Date() } });
    return res.count;
  }

  userById(userId: string): Promise<{ id: string; branchId: string | null } | null> {
    return this.db.user.findUnique({ where: { id: userId }, select: { id: true, branchId: true } });
  }

  // ==================== Permission Overrides + Impersonation (Phase 9.6c) ====================

  userForAuth(
    userId: string,
  ): Promise<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    branchId: string | null;
  } | null> {
    return this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, isActive: true, branchId: true },
    });
  }

  overridesFor(userId: string): Promise<{ permission: string; granted: boolean }[]> {
    return this.db.userPermissionOverride.findMany({
      where: { userId },
      select: { permission: true, granted: true },
      orderBy: { permission: "asc" },
    });
  }

  upsertOverride(userId: string, permission: string, granted: boolean, actorId: string): Promise<unknown> {
    return this.db.userPermissionOverride.upsert({
      where: { userId_permission: { userId, permission } },
      create: { userId, permission, granted, createdById: actorId },
      update: { granted, createdById: actorId },
    });
  }

  removeOverride(userId: string, permission: string): Promise<unknown> {
    return this.db.userPermissionOverride
      .delete({ where: { userId_permission: { userId, permission } } })
      .catch(() => null); // idempotent
  }

  /** نسخ عدة تجاوزات دفعة واحدة ذرّياً (كلها أو لا شيء) - Phase 9.7 */
  copyOverrides(userId: string, permissions: readonly string[], actorId: string): Promise<unknown> {
    if (permissions.length === 0) return Promise.resolve([]);
    return this.db.$transaction(
      permissions.map((permission) =>
        this.db.userPermissionOverride.upsert({
          where: { userId_permission: { userId, permission } },
          create: { userId, permission, granted: true, createdById: actorId },
          update: { granted: true, createdById: actorId },
        }),
      ),
    );
  }

  // ==================== Login history (from audit) ====================

  async listLoginHistory(params: {
    skip: number;
    take: number;
    userId?: string;
    action?: AuditAction;
  }): Promise<{ rows: AuditWithUser[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      action: params.action ? params.action : { in: [...LOGIN_AUDIT_ACTIONS] },
    };
    if (params.userId) where.userId = params.userId;
    const [rows, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        select: {
          id: true,
          action: true,
          email: true,
          userId: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
      this.db.auditLog.count({ where }),
    ]);
    return { rows, total };
  }

  async loginCounts(): Promise<{ successLast24h: number; failedLast24h: number; failedLast7d: number }> {
    const day = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [successLast24h, failedLast24h, failedLast7d] = await Promise.all([
      this.db.auditLog.count({ where: { action: "LOGIN_SUCCESS", createdAt: { gte: day } } }),
      this.db.auditLog.count({ where: { action: "LOGIN_FAILED", createdAt: { gte: day } } }),
      this.db.auditLog.count({ where: { action: "LOGIN_FAILED", createdAt: { gte: week } } }),
    ]);
    return { successLast24h, failedLast24h, failedLast7d };
  }

  recentSecurityEvents(limit: number): Promise<AuditWithUser[]> {
    return this.db.auditLog.findMany({
      where: { action: { in: [...LOGIN_AUDIT_ACTIONS] } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        action: true,
        email: true,
        userId: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });
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
