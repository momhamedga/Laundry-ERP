import type { User, UserRole } from "@prisma/client";
import { hashPassword } from "../../lib/bcrypt.js";
import { ApiError } from "../../middlewares/error.middleware.js";
import { toSafeUser } from "../auth/auth.utils.js";
import type { AuthenticatedUser, SafeUser } from "../auth/index.js";
import { notificationBus } from "../notifications/index.js";
import type {
  ActivityQuery,
  AdminResetPasswordDto,
  CreateUserDto,
  ListUsersQuery,
  UpdateProfileDto,
  UpdateUserDto,
} from "./users.dto.js";
import type { UsersRepository } from "./users.repository.js";
import type { ActivityResult, ListUsersResult, UserDetails } from "./users.types.js";
import {
  buildPaginationMeta,
  buildUserOrderBy,
  buildUserWhere,
  toSkipTake,
} from "./users.utils.js";

export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  // ==================== Guards ====================

  private async getUserOrFail(id: string): Promise<User> {
    const user = await this.repo.findById(id);
    if (!user) throw new ApiError(404, "المستخدم غير موجود.");
    return user;
  }

  private async ensureEmailAvailable(email: string, excludeId?: string): Promise<void> {
    const existing = await this.repo.findByEmail(email);
    if (existing && existing.id !== excludeId) {
      throw new ApiError(409, "البريد الإلكتروني مستخدم بالفعل.");
    }
  }

  /** حماية آخر Admin نشط من التعطيل/الحذف/تغيير الدور */
  private async ensureNotLastActiveAdmin(user: User): Promise<void> {
    if (user.role !== "ADMIN" || !user.isActive) return;
    const others = await this.repo.countOtherActiveAdmins(user.id);
    if (others === 0) {
      throw new ApiError(400, "لا يمكن تعديل آخر مدير نظام نشط.");
    }
  }

  // ==================== List / Get ====================

  async list(query: ListUsersQuery): Promise<ListUsersResult> {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const [users, total] = await this.repo.findManyWithCount(
      buildUserWhere(query),
      buildUserOrderBy(query),
      skip,
      take,
    );

    return {
      users: users.map(toSafeUser),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getById(id: string): Promise<UserDetails> {
    const user = await this.getUserOrFail(id);
    const [lastLoginAt, activeSessions] = await Promise.all([
      this.repo.getLastLoginAt(id),
      this.repo.countActiveSessions(id),
    ]);

    return { user: toSafeUser(user), lastLoginAt, activeSessions };
  }

  // ==================== Create / Update ====================

  async create(dto: CreateUserDto, actor: AuthenticatedUser): Promise<SafeUser> {
    await this.ensureEmailAvailable(dto.email);

    const user = await this.repo.create({
      name: dto.name,
      email: dto.email,
      passwordHash: await hashPassword(dto.password),
      role: dto.role,
      phone: dto.phone ?? null,
      isActive: dto.isActive,
      ...(dto.branchId ? { branch: { connect: { id: dto.branchId } } } : {}),
    });

    notificationBus.emitNotification({
      type: "USER_CREATED",
      data: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        role: user.role,
        createdByEmail: actor.email,
      },
    });

    return toSafeUser(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<SafeUser> {
    await this.getUserOrFail(id);
    if (dto.email !== undefined) {
      await this.ensureEmailAvailable(dto.email, id);
    }

    const user = await this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.branchId !== undefined
        ? {
            branch:
              dto.branchId === null
                ? { disconnect: true }
                : { connect: { id: dto.branchId } },
          }
        : {}),
    });

    return toSafeUser(user);
  }

  // ==================== Delete (Soft) ====================

  /**
   * Soft Delete: النظام يدعمه عبر isActive
   * (لا حذف فعلي - سجلات الطلبات والمدفوعات مرتبطة بـ Restrict)
   */
  async softDelete(id: string, actorId: string): Promise<void> {
    if (id === actorId) {
      throw new ApiError(400, "لا يمكنك حذف حسابك الخاص.");
    }
    const user = await this.getUserOrFail(id);
    await this.ensureNotLastActiveAdmin(user);

    await this.repo.update(id, { isActive: false });
    await this.repo.revokeAllSessions(id);
  }

  // ==================== Status / Role ====================

  async changeStatus(id: string, isActive: boolean, actorId: string): Promise<SafeUser> {
    if (id === actorId) {
      throw new ApiError(400, "لا يمكنك تغيير حالة حسابك الخاص.");
    }
    const user = await this.getUserOrFail(id);

    if (!isActive) {
      await this.ensureNotLastActiveAdmin(user);
      await this.repo.revokeAllSessions(id);
    }

    const updated = await this.repo.update(id, { isActive });

    // بلا اسم/بريد "من قام بالتعطيل" هنا عمداً - actorId نص خام فقط بهذا المسار
    // (بلا AuthenticatedUser كامل)، وجلب اسمه يتطلب استعلاماً إضافياً لا داعي له
    if (!isActive) {
      notificationBus.emitNotification({
        type: "USER_DISABLED",
        data: { userId: updated.id, userName: updated.name },
      });
    }

    return toSafeUser(updated);
  }

  async assignRole(id: string, role: UserRole, actorId: string): Promise<SafeUser> {
    if (id === actorId) {
      throw new ApiError(400, "لا يمكنك تغيير دور حسابك الخاص.");
    }
    const user = await this.getUserOrFail(id);

    if (user.role === role) return toSafeUser(user);
    // تخفيض Admin → التأكد من وجود Admin نشط آخر
    if (user.role === "ADMIN") {
      await this.ensureNotLastActiveAdmin(user);
    }

    return toSafeUser(await this.repo.update(id, { role }));
  }

  // ==================== Admin Reset Password ====================

  async adminResetPassword(id: string, dto: AdminResetPasswordDto): Promise<void> {
    await this.getUserOrFail(id);

    await this.repo.update(id, {
      passwordHash: await hashPassword(dto.newPassword),
      passwordChangedAt: new Date(), // يُبطل كل access tokens الحالية
      failedLoginAttempts: 0,
      lockedUntil: null,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    });
    await this.repo.revokeAllSessions(id);
  }

  // ==================== Profile (Self) ====================

  async getProfile(userId: string): Promise<UserDetails> {
    return this.getById(userId);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<SafeUser> {
    await this.getUserOrFail(userId);
    const user = await this.repo.update(userId, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
    });
    return toSafeUser(user);
  }

  /**
   * Upload Avatar - Structure فقط
   * TODO(cloudinary): رفع الصورة إلى Cloudinary وحفظ avatarUrl
   */
  uploadAvatar(): never {
    throw new ApiError(501, "رفع الصورة الشخصية سيتاح بعد ضبط خدمة الصور.");
  }

  // ==================== Activity History ====================

  async getActivity(id: string, query: ActivityQuery): Promise<ActivityResult> {
    await this.getUserOrFail(id);

    const { skip, take } = toSkipTake(query.page, query.limit);
    const [logs, total] = await this.repo.findActivityWithCount(id, skip, take);

    return {
      activity: logs.map((l) => ({
        id: l.id,
        action: l.action,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        metadata: l.metadata,
        createdAt: l.createdAt,
      })),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }
}
