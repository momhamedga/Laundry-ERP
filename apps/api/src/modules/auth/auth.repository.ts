import type {
  AuditAction,
  Prisma,
  PrismaClient,
  RefreshToken,
  User,
} from "@prisma/client";
import type { RequestContext } from "./auth.types.js";

/**
 * Repository Pattern - كل وصول لقاعدة البيانات الخاص بالمصادقة يمر من هنا
 * PrismaClient يُحقن عبر الـ constructor (Dependency Injection)
 */
export class AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  // ==================== Users ====================

  findUserByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { email } });
  }

  findUserById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  /** تسجيل محاولة فاشلة + قفل الحساب عند تجاوز الحد */
  recordFailedLogin(userId: string, lockUntil: Date | null): Promise<User> {
    return this.db.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
        ...(lockUntil ? { lockedUntil: lockUntil } : {}),
      },
    });
  }

  /** تصفير عداد المحاولات بعد نجاح الدخول */
  resetFailedLogins(userId: string): Promise<User> {
    return this.db.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  updatePassword(userId: string, passwordHash: string): Promise<User> {
    return this.db.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  setResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<User> {
    return this.db.user.update({
      where: { id: userId },
      data: { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt },
    });
  }

  findUserByResetTokenHash(tokenHash: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { resetTokenHash: tokenHash } });
  }

  // ==================== Refresh Tokens (Sessions) ====================

  createRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    ctx: RequestContext,
  ): Promise<RefreshToken> {
    return this.db.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    });
  }

  findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.db.refreshToken.findUnique({ where: { tokenHash } });
  }

  revokeRefreshToken(id: string): Promise<RefreshToken> {
    return this.db.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  /** إبطال كل جلسات المستخدم - عند كشف سرقة توكين أو تغيير كلمة السر */
  async revokeAllUserTokens(userId: string): Promise<number> {
    const result = await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  /** الجلسات النشطة للمستخدم */
  findActiveSessions(userId: string): Promise<RefreshToken[]> {
    return this.db.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
  }

  findSessionById(id: string, userId: string): Promise<RefreshToken | null> {
    return this.db.refreshToken.findFirst({ where: { id, userId } });
  }

  // ==================== Audit Log ====================

  createAuditLog(entry: {
    action: AuditAction;
    userId?: string | null;
    email?: string | null;
    ctx: RequestContext;
    metadata?: Prisma.InputJsonValue;
  }): Promise<unknown> {
    return this.db.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId ?? null,
        email: entry.email ?? null,
        ipAddress: entry.ctx.ipAddress,
        userAgent: entry.ctx.userAgent,
        ...(entry.metadata !== undefined ? { metadata: entry.metadata } : {}),
      },
    });
  }
}
