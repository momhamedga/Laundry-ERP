import type { User } from "@prisma/client";
import { env } from "../../config/env.js";
import {
  comparePassword,
  DUMMY_PASSWORD_HASH,
  hashPassword,
} from "../../lib/bcrypt.js";
import { signAccessToken } from "../../lib/jwt.js";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { EmailService } from "../email/index.js";
import { notificationBus } from "../notifications/index.js";
import {
  ACCOUNT_LOCK_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS,
  RESET_TOKEN_EXPIRES_MINUTES,
} from "./auth.constants.js";
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from "./auth.dto.js";
import type { AuthRepository } from "./auth.repository.js";
import type {
  LoginResult,
  RequestContext,
  SafeUser,
  SessionInfo,
  TokenPair,
} from "./auth.types.js";
import { generateOpaqueToken, hashToken, toSafeUser } from "./auth.utils.js";

export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly emailService: EmailService,
  ) {}

  // ==================== Login ====================

  async login(dto: LoginDto, ctx: RequestContext): Promise<LoginResult> {
    const user = await this.repo.findUserByEmail(dto.email);

    // مقارنة وهمية عند غياب المستخدم - زمن استجابة موحد ضد User Enumeration
    if (!user) {
      await comparePassword(dto.password, DUMMY_PASSWORD_HASH);
      await this.repo.createAuditLog({
        action: "LOGIN_FAILED",
        email: dto.email,
        ctx,
        metadata: { reason: "user_not_found" },
      });
      throw new ApiError(401, "البريد الإلكتروني أو كلمة السر غير صحيحة.");
    }

    if (!user.isActive) {
      await this.repo.createAuditLog({
        action: "LOGIN_FAILED",
        userId: user.id,
        email: dto.email,
        ctx,
        metadata: { reason: "account_inactive" },
      });
      throw new ApiError(403, "هذا الحساب موقوف. راجع المسؤول.");
    }

    // Account Lock - الحساب مقفول حالياً؟
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new ApiError(
        423,
        `تم قفل الحساب مؤقتاً بسبب محاولات دخول فاشلة. أعد المحاولة بعد ${minutesLeft} دقيقة.`,
      );
    }

    const passwordValid = await comparePassword(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.handleFailedAttempt(user, ctx);
      throw new ApiError(401, "البريد الإلكتروني أو كلمة السر غير صحيحة.");
    }

    // نجاح: تصفير العداد + إصدار التوكينات + تدقيق
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.repo.resetFailedLogins(user.id);
    }

    // يُقرأ قبل issueTokens (الذي يُنشئ جلسة جديدة فوراً) ليعكس الجلسات السابقة فقط
    const priorSessions = await this.repo.findActiveSessions(user.id);

    const tokens = await this.issueTokens(user, ctx);
    await this.repo.createAuditLog({
      action: "LOGIN_SUCCESS",
      userId: user.id,
      email: user.email,
      ctx,
    });

    // جهاز جديد = يوجد جلسات سابقة فعلاً (ليس أول دخول إطلاقاً) ولا واحدة منها
    // بنفس الـ User-Agent الحالي. أول دخول للحساب لا يُعتبر "جهازاً جديداً"
    const isNewDevice =
      priorSessions.length > 0 && !priorSessions.some((s) => s.userAgent === ctx.userAgent);
    if (isNewDevice) {
      notificationBus.emitNotification({
        type: "NEW_DEVICE_LOGIN",
        targetUserId: user.id,
        data: {
          userAgent: ctx.userAgent,
          ipAddress: ctx.ipAddress,
          loginAt: new Date().toISOString(),
        },
      });
    }

    return { user: toSafeUser(user), tokens };
  }

  private async handleFailedAttempt(user: User, ctx: RequestContext): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;
    const lockUntil = shouldLock
      ? new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60_000)
      : null;

    await this.repo.recordFailedLogin(user.id, lockUntil);
    await this.repo.createAuditLog({
      action: shouldLock ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
      userId: user.id,
      email: user.email,
      ctx,
      metadata: { attempts, ...(shouldLock ? { lockMinutes: ACCOUNT_LOCK_MINUTES } : {}) },
    });

    if (shouldLock && lockUntil) {
      notificationBus.emitNotification({
        type: "ACCOUNT_LOCKED",
        targetUserId: user.id,
        data: { attempts, lockedUntil: lockUntil.toISOString() },
      });
    }
  }

  // ==================== Tokens ====================

  private async issueTokens(user: User, ctx: RequestContext): Promise<TokenPair> {
    const refreshToken = generateOpaqueToken();
    const expiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.repo.createRefreshToken(user.id, hashToken(refreshToken), expiresAt, ctx);

    return {
      accessToken: signAccessToken({ sub: user.id, role: user.role }),
      refreshToken,
      accessTokenExpiresInSec: env.ACCESS_TOKEN_TTL_MIN * 60,
    };
  }

  /**
   * Refresh Token Rotation:
   * - كل استخدام يُبطل التوكين القديم ويُصدر جديداً
   * - استخدام توكين مُبطل = مؤشر سرقة → إبطال كل جلسات المستخدم فوراً
   */
  async refresh(rawToken: string, ctx: RequestContext): Promise<TokenPair> {
    const stored = await this.repo.findRefreshTokenByHash(hashToken(rawToken));

    if (!stored) {
      throw new ApiError(401, "جلسة غير صالحة. سجّل الدخول من جديد.");
    }

    // Reuse Detection - التوكين سبق إبطاله ويُعاد استخدامه
    if (stored.revokedAt) {
      await this.repo.revokeAllUserTokens(stored.userId);
      await this.repo.createAuditLog({
        action: "TOKEN_REUSE_DETECTED",
        userId: stored.userId,
        ctx,
        metadata: { tokenId: stored.id },
      });
      throw new ApiError(401, "رُصد استخدام جلسة منتهية، وأُلغيت كل الجلسات احتياطاً. سجّل الدخول من جديد.");
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new ApiError(401, "انتهت صلاحية الجلسة. سجّل الدخول من جديد.");
    }

    const user = await this.repo.findUserById(stored.userId);
    if (!user || !user.isActive) {
      throw new ApiError(401, "الحساب موقوف أو لم يعد موجوداً.");
    }

    // Rotation: إبطال القديم ثم إصدار زوج جديد
    await this.repo.revokeRefreshToken(stored.id);
    const tokens = await this.issueTokens(user, ctx);

    await this.repo.createAuditLog({
      action: "TOKEN_REFRESHED",
      userId: user.id,
      ctx,
    });

    return tokens;
  }

  // ==================== Logout ====================

  async logout(rawToken: string | null, ctx: RequestContext): Promise<void> {
    if (!rawToken) return;

    const stored = await this.repo.findRefreshTokenByHash(hashToken(rawToken));
    if (stored && !stored.revokedAt) {
      await this.repo.revokeRefreshToken(stored.id);
      await this.repo.createAuditLog({
        action: "LOGOUT",
        userId: stored.userId,
        ctx,
      });
    }
  }

  // ==================== Current User ====================

  async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new ApiError(404, "المستخدم غير موجود.");
    }
    return toSafeUser(user);
  }

  // ==================== Change Password ====================

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ctx: RequestContext,
  ): Promise<void> {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new ApiError(404, "المستخدم غير موجود.");
    }

    const valid = await comparePassword(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new ApiError(400, "كلمة السر الحالية غير صحيحة.");
    }

    await this.repo.updatePassword(userId, await hashPassword(dto.newPassword));
    // تغيير كلمة السر يُبطل كل الجلسات - يجب إعادة تسجيل الدخول
    await this.repo.revokeAllUserTokens(userId);
    await this.repo.createAuditLog({
      action: "PASSWORD_CHANGED",
      userId,
      email: user.email,
      ctx,
    });
  }

  // ==================== Forgot / Reset Password (Structure) ====================

  /**
   * يولّد التوكين، يخزن الـ hash فقط (SHA-256 - التوكين الخام لا يُخزن أبداً)،
   * ويُرسل رابط إعادة التعيين بريدياً عبر EmailService الحقيقي.
   * الاستجابة موحدة دائماً - لا تكشف وجود البريد من عدمه، وفشل الإرسال
   * (مثلاً RESEND_API_KEY غير مُهيَّأ) لا يُغيِّر هذا السلوك - يُسجَّل فقط
   * بسجلات الخادم (console.error) بدل كسر العقد الأمني الحالي.
   */
  async forgotPassword(dto: ForgotPasswordDto, ctx: RequestContext): Promise<void> {
    const user = await this.repo.findUserByEmail(dto.email);
    if (!user || !user.isActive) return; // استجابة موحدة صامتة

    const token = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MINUTES * 60_000);
    await this.repo.setResetToken(user.id, hashToken(token), expiresAt);

    await this.repo.createAuditLog({
      action: "PASSWORD_RESET_REQUESTED",
      userId: user.id,
      email: user.email,
      ctx,
    });

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        resetUrl,
        RESET_TOKEN_EXPIRES_MINUTES,
      );
    } catch (err) {
      console.error("[auth] Failed to send password reset email:", err);
    }
  }

  async resetPassword(dto: ResetPasswordDto, ctx: RequestContext): Promise<void> {
    const user = await this.repo.findUserByResetTokenHash(hashToken(dto.token));

    if (
      !user ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt.getTime() <= Date.now()
    ) {
      throw new ApiError(400, "رابط إعادة التعيين غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.");
    }

    await this.repo.updatePassword(user.id, await hashPassword(dto.newPassword));
    await this.repo.revokeAllUserTokens(user.id);
    await this.repo.createAuditLog({
      action: "PASSWORD_RESET_COMPLETED",
      userId: user.id,
      email: user.email,
      ctx,
    });

    notificationBus.emitNotification({
      type: "PASSWORD_RESET",
      targetUserId: user.id,
      data: { resetAt: new Date().toISOString() },
    });
  }

  // ==================== Session Management ====================

  async listSessions(userId: string, currentRawToken: string | null): Promise<SessionInfo[]> {
    const currentHash = currentRawToken ? hashToken(currentRawToken) : null;
    const sessions = await this.repo.findActiveSessions(userId);

    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      current: currentHash !== null && s.tokenHash === currentHash,
    }));
  }

  async revokeSession(userId: string, sessionId: string, ctx: RequestContext): Promise<void> {
    const session = await this.repo.findSessionById(sessionId, userId);
    if (!session) {
      throw new ApiError(404, "الجلسة غير موجودة.");
    }
    if (!session.revokedAt) {
      await this.repo.revokeRefreshToken(session.id);
      await this.repo.createAuditLog({
        action: "SESSION_REVOKED",
        userId,
        ctx,
        metadata: { sessionId },
      });
    }
  }
}
