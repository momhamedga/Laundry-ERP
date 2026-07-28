import type { AuditAction, Prisma, PrismaClient, SystemSettings } from "@prisma/client";

/** الصف الوحيد - Singleton بمعرّف ثابت */
const SINGLETON_ID = "singleton";

/**
 * Repository Pattern - كل وصول لقاعدة البيانات الخاص بالإعدادات
 */
export class SettingsRepository {
  constructor(private readonly db: PrismaClient) {}

  /** يضمن وجود الصف دائماً - يُنشئه بالقيم الافتراضية إن لم يكن موجوداً بعد */
  async getOrCreate(): Promise<SystemSettings> {
    const existing = await this.db.systemSettings.findUnique({ where: { id: SINGLETON_ID } });
    if (existing) return existing;
    return this.db.systemSettings.create({ data: { id: SINGLETON_ID } });
  }

  update(data: Prisma.SystemSettingsUpdateInput): Promise<SystemSettings> {
    return this.db.systemSettings.update({ where: { id: SINGLETON_ID }, data });
  }

  createAuditLog(entry: {
    action: AuditAction;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Prisma.InputJsonValue;
  }): Promise<unknown> {
    return this.db.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        metadata: entry.metadata,
      },
    });
  }
}
