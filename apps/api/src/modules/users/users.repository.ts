import type { AuditLog, Prisma, PrismaClient, User } from "@prisma/client";

/**
 * Repository Pattern - كل وصول لقاعدة البيانات الخاص بإدارة المستخدمين
 */
export class UsersRepository {
  constructor(private readonly db: PrismaClient) {}

  // ==================== Queries ====================

  /** قائمة + العدد الكلي في transaction واحدة */
  findManyWithCount(
    where: Prisma.UserWhereInput,
    orderBy: Prisma.UserOrderByWithRelationInput,
    skip: number,
    take: number,
  ): Promise<[User[], number]> {
    return this.db.$transaction([
      this.db.user.findMany({ where, orderBy, skip, take }),
      this.db.user.count({ where }),
    ]);
  }

  findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { email } });
  }

  /** عدد مدراء النظام النشطين غير مستخدم معين - لحماية آخر Admin */
  countOtherActiveAdmins(excludeUserId: string): Promise<number> {
    return this.db.user.count({
      where: { role: "ADMIN", isActive: true, id: { not: excludeUserId } },
    });
  }

  // ==================== Mutations ====================

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.db.user.create({ data });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.db.user.update({ where: { id }, data });
  }

  /** إبطال كل جلسات المستخدم - عند التعطيل/الحذف/تغيير كلمة السر */
  async revokeAllSessions(userId: string): Promise<number> {
    const result = await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  // ==================== Operational Data (from AuditLog / Sessions) ====================

  /** آخر تسجيل دخول ناجح */
  async getLastLoginAt(userId: string): Promise<Date | null> {
    const last = await this.db.auditLog.findFirst({
      where: { userId, action: "LOGIN_SUCCESS" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    return last?.createdAt ?? null;
  }

  /** عدد الجلسات النشطة */
  countActiveSessions(userId: string): Promise<number> {
    return this.db.refreshToken.count({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  /** سجل نشاط المستخدم مرقّماً */
  findActivityWithCount(
    userId: string,
    skip: number,
    take: number,
  ): Promise<[AuditLog[], number]> {
    return this.db.$transaction([
      this.db.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.db.auditLog.count({ where: { userId } }),
    ]);
  }
}
