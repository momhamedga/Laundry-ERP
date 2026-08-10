import type { AuditAction, Prisma, UserRole } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import { signAccessToken } from "../../lib/jwt.js";
import { computeEffectivePermissions } from "../auth/auth.constants.js";
import type { AuthenticatedUser, RequestContext } from "../auth/index.js";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../auth/index.js";
import { notificationBus } from "../notifications/notification.bus.js";
import { RECENT_EVENTS_LIMIT } from "./admin.constants.js";
import type { AdminRepository } from "./admin.repository.js";
import type { ForceLogoutDto, ListLoginHistoryQueryDto } from "./admin.dto.js";
import type {
  ForceLogoutResult,
  ListLoginHistoryResult,
  LoginHistoryEntry,
  PermissionMatrix,
  SecurityCenter,
  SessionView,
} from "./admin.types.js";

const ALL_ROLES: UserRole[] = ["ADMIN", "MANAGER", "CASHIER", "WORKER", "DELIVERY"];

export class AdminService {
  constructor(private readonly repo: AdminRepository) {}

  // ==================== Security Center ====================

  async getSecurityCenter(): Promise<SecurityCenter> {
    const [userCounts, sessions, logins, recent] = await Promise.all([
      this.repo.userCounts(),
      this.repo.sessionStats(),
      this.repo.loginCounts(),
      this.repo.recentSecurityEvents(RECENT_EVENTS_LIMIT),
    ]);

    return {
      users: {
        total: userCounts.total,
        active: userCounts.active,
        inactive: userCounts.total - userCounts.active,
        locked: userCounts.locked,
        byRole: userCounts.byRole,
      },
      sessions: { active: sessions.active, users: sessions.users },
      logins,
      recentEvents: recent.map((r) => this.toLoginEntry(r)),
    };
  }

  // ==================== Login history ====================

  async listLoginHistory(query: ListLoginHistoryQueryDto): Promise<ListLoginHistoryResult> {
    const { page, limit } = query;
    const { rows, total } = await this.repo.listLoginHistory({
      skip: (page - 1) * limit,
      take: limit,
      userId: query.userId,
      action: query.action as AuditAction | undefined,
    });
    return { entries: rows.map((r) => this.toLoginEntry(r)), meta: this.meta(page, limit, total) };
  }

  // ==================== Sessions ====================

  async getUserSessions(userId: string): Promise<SessionView[]> {
    const user = await this.repo.userById(userId);
    if (!user) throw new ApiError(404, "المستخدم غير موجود");
    const sessions = await this.repo.findUserSessions(userId);
    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.user.name,
      userEmail: s.user.email,
      userRole: s.user.role,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    }));
  }

  async killSession(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    sessionId: string,
  ): Promise<void> {
    const session = await this.repo.findSessionById(sessionId);
    if (!session) throw new ApiError(404, "الجلسة غير موجودة");
    if (session.revokedAt) throw new ApiError(409, "الجلسة مُبطلة بالفعل");
    await this.repo.revokeSession(sessionId);
    await this.audit(actor, ctx, "SESSION_REVOKED", {
      sessionId,
      targetUserId: session.userId,
      byAdmin: true,
    });
  }

  /** الإخراج القسري - user/branch/all - يبطل كل التوكينات المطابقة */
  async forceLogout(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    dto: ForceLogoutDto,
  ): Promise<ForceLogoutResult> {
    if (dto.scope === "user") {
      const user = await this.repo.userById(dto.userId as string);
      if (!user) throw new ApiError(404, "المستخدم غير موجود");
    }
    const revoked = await this.repo.revokeByScope(dto.scope, {
      userId: dto.userId,
      branchId: dto.branchId,
    });
    await this.audit(actor, ctx, "USER_FORCE_LOGOUT", {
      scope: dto.scope,
      userId: dto.userId ?? null,
      branchId: dto.branchId ?? null,
      revoked,
    });

    // إشعار موجّه للمستخدم المُخرَج قسرياً (النطاق user فقط) - fire-and-forget
    if (dto.scope === "user" && dto.userId) {
      try {
        notificationBus.emitNotification({
          type: "PASSWORD_RESET",
          data: { resetAt: new Date().toISOString() },
          targetUserId: dto.userId,
        });
      } catch {
        // متعمّد: بثّ الإشعار لا يُفشِل عملية الإخراج
      }
    }

    return { revoked, scope: dto.scope };
  }

  // ==================== Permissions Matrix (read-only) ====================

  getPermissionMatrix(): PermissionMatrix {
    const matrix = {} as Record<UserRole, readonly (typeof PERMISSIONS)[number][]>;
    for (const role of ALL_ROLES) matrix[role] = ROLE_PERMISSIONS[role];
    return { permissions: PERMISSIONS, roles: ALL_ROLES, matrix };
  }

  // ==================== Per-user Permission Overrides (Phase 9.6c) ====================

  /** صلاحيات مستخدم بعينه: صلاحيات الدور + التجاوزات + المحصّلة الفعلية */
  async getUserPermissions(userId: string): Promise<{
    userId: string;
    role: UserRole;
    rolePermissions: readonly string[];
    overrides: { permission: string; granted: boolean }[];
    effective: string[];
  }> {
    const user = await this.repo.userForAuth(userId);
    if (!user) throw new ApiError(404, "المستخدم غير موجود");
    const overrides = await this.repo.overridesFor(userId);
    return {
      userId,
      role: user.role,
      rolePermissions: ROLE_PERMISSIONS[user.role],
      overrides,
      effective: computeEffectivePermissions(user.role, overrides),
    };
  }

  async setOverride(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    userId: string,
    permission: string,
    granted: boolean,
  ): Promise<void> {
    const user = await this.repo.userForAuth(userId);
    if (!user) throw new ApiError(404, "المستخدم غير موجود");
    if (!(PERMISSIONS as readonly string[]).includes(permission)) {
      throw new ApiError(400, "صلاحية غير معروفة");
    }
    await this.repo.upsertOverride(userId, permission, granted, actor.id);
    await this.audit(actor, ctx, "USER_PERMISSION_OVERRIDE", { userId, permission, granted });
  }

  async removeOverride(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    userId: string,
    permission: string,
  ): Promise<void> {
    await this.repo.removeOverride(userId, permission);
    await this.audit(actor, ctx, "USER_PERMISSION_OVERRIDE", { userId, permission, removed: true });
  }

  /** نسخ الصلاحيات الفعلية لمستخدم مصدر إلى الهدف كتجاوزات (منح ما ينقص) */
  async copyPermissions(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    targetUserId: string,
    sourceUserId: string,
  ): Promise<void> {
    const [target, source] = await Promise.all([
      this.repo.userForAuth(targetUserId),
      this.repo.userForAuth(sourceUserId),
    ]);
    if (!target || !source) throw new ApiError(404, "المستخدم غير موجود");

    const sourceOverrides = await this.repo.overridesFor(sourceUserId);
    const sourceEffective = new Set(computeEffectivePermissions(source.role, sourceOverrides));
    const targetRolePerms = new Set(ROLE_PERMISSIONS[target.role]);

    // امنح ما لدى المصدر ويفتقده دور الهدف - دفعة ذرّية واحدة (لا نسخ جزئي عند الفشل)
    const toGrant = [...sourceEffective].filter(
      (perm) => !targetRolePerms.has(perm as (typeof PERMISSIONS)[number]),
    );
    await this.repo.copyOverrides(targetUserId, toGrant, actor.id);
    await this.audit(actor, ctx, "USER_PERMISSION_OVERRIDE", { userId: targetUserId, copiedFrom: sourceUserId, count: toGrant.length });
  }

  // ==================== Impersonation (Phase 9.6c) ====================

  /** يصدر توكين انتحال قصير الأجل لمستخدم هدف (ADMIN فقط، لا انتحال مدير آخر) */
  async impersonate(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    targetUserId: string,
  ): Promise<{
    accessToken: string;
    // branchId ضمن الرد: الجلسة المنتحَلة يجب أن تتصرّف كالمستخدم الهدف تماماً،
    // وبدونه تظنّ الواجهة أن الحساب بلا فرع فتعرض له اختيار فرع لا يخصّه.
    user: { id: string; name: string; email: string; role: UserRole; branchId: string | null };
  }> {
    if (actor.role !== "ADMIN") throw new ApiError(403, "الانتحال متاح لمدير النظام فقط");
    if (actor.impersonatedBy) throw new ApiError(409, "أنت بالفعل في جلسة انتحال");
    if (targetUserId === actor.id) throw new ApiError(400, "لا يمكن انتحال حسابك");

    const target = await this.repo.userForAuth(targetUserId);
    if (!target) throw new ApiError(404, "المستخدم غير موجود");
    if (!target.isActive) throw new ApiError(409, "الحساب غير مفعّل");
    if (target.role === "ADMIN") throw new ApiError(403, "لا يمكن انتحال حساب مدير نظام آخر");

    const accessToken = signAccessToken({
      sub: target.id,
      role: target.role,
      impersonatedBy: actor.id,
    });
    await this.audit(actor, ctx, "USER_IMPERSONATED", { targetUserId, event: "start" });
    return {
      accessToken,
      user: {
        id: target.id,
        name: target.name,
        email: target.email,
        role: target.role,
        branchId: target.branchId,
      },
    };
  }

  /** تسجيل إنهاء الانتحال (العودة لحساب المدير تتم بالعميل باستعادة توكينه) */
  async stopImpersonation(actor: AuthenticatedUser, ctx: RequestContext): Promise<void> {
    if (!actor.impersonatedBy) throw new ApiError(400, "لا توجد جلسة انتحال نشطة");
    await this.repo.createAuditLog({
      action: "USER_IMPERSONATED",
      userId: actor.impersonatedBy,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { targetUserId: actor.id, event: "stop" } as Prisma.InputJsonValue,
    });
  }

  // ==================== helpers ====================

  private toLoginEntry(r: {
    id: string;
    action: string;
    email: string | null;
    userId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    user: { name: string } | null;
  }): LoginHistoryEntry {
    return {
      id: r.id,
      action: r.action,
      email: r.email,
      userId: r.userId,
      userName: r.user?.name ?? null,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      createdAt: r.createdAt.toISOString(),
    };
  }

  private meta(page: number, limit: number, total: number) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
  }

  private async audit(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    action: AuditAction,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.createAuditLog({
      action,
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: metadata as Prisma.InputJsonValue,
    });
  }
}
