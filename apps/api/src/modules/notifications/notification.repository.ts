import type {
  AuditAction,
  DeliveryStatus,
  NotificationChannel,
  NotificationType,
  Prisma,
  PrismaClient,
  UserRole,
} from "@prisma/client";
import type { BulkActionDto, UpdateChannelSettingsDto } from "./notification.dto.js";
import type {
  ChannelSettingsRow,
  DeliveryDueRow,
  NotificationRow,
  NotificationStatistics,
  PreferenceChannels,
  QueueStatus,
} from "./notification.types.js";

const CHANNEL_SETTINGS_SELECT = {
  globalInApp: true,
  globalEmail: true,
  globalSms: true,
  globalWhatsapp: true,
  globalPush: true,
  quietHoursEnabled: true,
  quietHoursStart: true,
  quietHoursEnd: true,
  quietHoursTimezone: true,
  digestMode: true,
} satisfies Prisma.UserNotificationSettingsSelect;

export class NotificationRepository {
  constructor(private readonly db: PrismaClient) {}

  // ==================== Recipients ====================

  async findActiveUserIdsByRoles(roles: readonly UserRole[]): Promise<string[]> {
    const users = await this.db.user.findMany({
      where: { role: { in: [...roles] }, isActive: true },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  // ==================== Create (Dispatch) ====================

  /**
   * إنشاء إشعار لمستخدم واحد + صفوف Outbox للقنوات الخارجية المُفعّلة له - ذرّياً.
   * IN_APP ليس له صف Outbox (الإشعار نفسه هو تسليمه).
   */
  createWithDeliveries(input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data: Prisma.InputJsonValue | undefined;
    entityType: string | null;
    entityId: string | null;
    externalChannels: readonly NotificationChannel[];
  }): Promise<NotificationRow> {
    return this.db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
        entityType: input.entityType,
        entityId: input.entityId,
        deliveries:
          input.externalChannels.length > 0
            ? {
                create: input.externalChannels.map((channel) => ({ channel })),
              }
            : undefined,
      },
    });
  }

  // ==================== List / Read ====================

  findManyWithCount(
    where: Prisma.NotificationWhereInput,
    skip: number,
    take: number,
  ): Promise<[NotificationRow[], number]> {
    return this.db.$transaction([
      this.db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.db.notification.count({ where }),
    ]);
  }

  findByIdForUser(id: string, userId: string): Promise<NotificationRow | null> {
    return this.db.notification.findFirst({ where: { id, userId } });
  }

  unreadCount(userId: string): Promise<number> {
    return this.db.notification.count({
      where: { userId, readAt: null, archivedAt: null },
    });
  }

  // ==================== Mutations (المستخدم لنفسه فقط - عزل بـ userId دائماً) ====================

  markRead(id: string, userId: string): Promise<Prisma.BatchPayload> {
    return this.db.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  markUnread(id: string, userId: string): Promise<Prisma.BatchPayload> {
    return this.db.notification.updateMany({
      where: { id, userId },
      data: { readAt: null },
    });
  }

  markAllRead(userId: string): Promise<Prisma.BatchPayload> {
    return this.db.notification.updateMany({
      where: { userId, readAt: null, archivedAt: null },
      data: { readAt: new Date() },
    });
  }

  archive(id: string, userId: string): Promise<Prisma.BatchPayload> {
    return this.db.notification.updateMany({
      where: { id, userId },
      data: { archivedAt: new Date() },
    });
  }

  unarchive(id: string, userId: string): Promise<Prisma.BatchPayload> {
    return this.db.notification.updateMany({
      where: { id, userId },
      data: { archivedAt: null },
    });
  }

  delete(id: string, userId: string): Promise<Prisma.BatchPayload> {
    return this.db.notification.deleteMany({ where: { id, userId } });
  }

  /** إجراء جماعي - كل الصفوف مُقيَّدة بـ userId دائماً (لا يمكن لمستخدم التأثير على إشعار غيره) */
  async bulkAction(userId: string, dto: BulkActionDto): Promise<number> {
    const where: Prisma.NotificationWhereInput = { id: { in: dto.ids }, userId };

    switch (dto.action) {
      case "read": {
        const r = await this.db.notification.updateMany({ where, data: { readAt: new Date() } });
        return r.count;
      }
      case "unread": {
        const r = await this.db.notification.updateMany({ where, data: { readAt: null } });
        return r.count;
      }
      case "archive": {
        const r = await this.db.notification.updateMany({
          where,
          data: { archivedAt: new Date() },
        });
        return r.count;
      }
      case "delete": {
        const r = await this.db.notification.deleteMany({ where });
        return r.count;
      }
    }
  }

  // ==================== Preferences ====================

  async findPreferences(
    userId: string,
  ): Promise<Map<NotificationType, PreferenceChannels>> {
    const rows = await this.db.notificationPreference.findMany({ where: { userId } });
    const map = new Map<NotificationType, PreferenceChannels>();
    for (const row of rows) {
      map.set(row.type, {
        inApp: row.inApp,
        email: row.email,
        sms: row.sms,
        whatsapp: row.whatsapp,
        push: row.push,
      });
    }
    return map;
  }

  /**
   * صافي التفضيلات لعدة مستخدمين لنوع واحد دفعة واحدة (تفادي N+1 عند البثّ لعدة مستقبِلين) -
   * المستخدمون بلا صف يُغيَّبون من الخريطة، والمستدعي يطبّق DEFAULT_PREFERENCE_CHANNELS
   */
  async findPreferencesForUsersAndType(
    userIds: readonly string[],
    type: NotificationType,
  ): Promise<Map<string, PreferenceChannels>> {
    const map = new Map<string, PreferenceChannels>();
    if (userIds.length === 0) return map;

    const rows = await this.db.notificationPreference.findMany({
      where: { userId: { in: [...userIds] }, type },
    });
    for (const row of rows) {
      map.set(row.userId, {
        inApp: row.inApp,
        email: row.email,
        sms: row.sms,
        whatsapp: row.whatsapp,
        push: row.push,
      });
    }
    return map;
  }

  async upsertPreference(
    userId: string,
    type: NotificationType,
    channels: PreferenceChannels,
  ): Promise<void> {
    await this.db.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, ...channels },
      update: { ...channels },
    });
  }

  // ==================== Audit ====================

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

  // ==================== Outbox (Delivery Scheduler) ====================

  findDueDeliveries(limit: number): Promise<DeliveryDueRow[]> {
    return this.db.notificationDelivery.findMany({
      where: { status: "PENDING", scheduledAt: { lte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      take: limit,
      include: {
        notification: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
                notificationSettings: { select: CHANNEL_SETTINGS_SELECT },
              },
            },
          },
        },
      },
    });
  }

  /** تأجيل بسبب Quiet Hours - لا زيادة attempts ولا تسجيل خطأ (ليس فشلاً، مجرد توقيت) */
  deferDelivery(id: string, nextCheckAt: Date): Promise<unknown> {
    return this.db.notificationDelivery.update({
      where: { id },
      data: { scheduledAt: nextCheckAt },
    });
  }

  markDeliverySent(id: string): Promise<unknown> {
    return this.db.notificationDelivery.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date(), lastError: null },
    });
  }

  markDeliverySkipped(id: string, reason: string): Promise<unknown> {
    return this.db.notificationDelivery.update({
      where: { id },
      data: { status: "SKIPPED", lastError: reason },
    });
  }

  markDeliveryFailedTerminal(id: string, attempts: number, error: string): Promise<unknown> {
    return this.db.notificationDelivery.update({
      where: { id },
      data: { status: "FAILED", attempts, lastError: error },
    });
  }

  rescheduleDelivery(
    id: string,
    attempts: number,
    error: string,
    nextAttemptAt: Date,
  ): Promise<unknown> {
    return this.db.notificationDelivery.update({
      where: { id },
      // تبقى PENDING عمداً - نفس الاستعلام (status=PENDING AND scheduledAt<=now) يلتقطها بالدورة التالية
      data: { status: "PENDING" as DeliveryStatus, attempts, lastError: error, scheduledAt: nextAttemptAt },
    });
  }

  /** كل الصفوف FAILED → PENDING بمحاولات صفر - يترك الجدولة الحالية تعالجها بالدورة التالية */
  async retryFailedDeliveries(): Promise<number> {
    const result = await this.db.notificationDelivery.updateMany({
      where: { status: "FAILED" },
      data: { status: "PENDING", attempts: 0, lastError: null, scheduledAt: new Date() },
    });
    return result.count;
  }

  async getQueueStatus(): Promise<QueueStatus> {
    const [grouped, retries, lastProcessed] = await Promise.all([
      this.db.notificationDelivery.groupBy({ by: ["status"], _count: { _all: true } }),
      this.db.notificationDelivery.count({ where: { attempts: { gt: 0 } } }),
      this.db.notificationDelivery.aggregate({
        where: { status: { in: ["SENT", "FAILED", "SKIPPED"] } },
        _max: { updatedAt: true },
      }),
    ]);

    const counts: Record<DeliveryStatus, number> = { PENDING: 0, SENT: 0, FAILED: 0, SKIPPED: 0 };
    for (const row of grouped) counts[row.status] = row._count._all;

    return {
      pending: counts.PENDING,
      sent: counts.SENT,
      failed: counts.FAILED,
      skipped: counts.SKIPPED,
      retries,
      lastProcessingAt: lastProcessed._max.updatedAt?.toISOString() ?? null,
    };
  }

  // ==================== Cleanup ====================

  async deleteOlderThan(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const result = await this.db.notification.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return result.count;
  }

  // ==================== Statistics (ذاتية - لمستخدم واحد) ====================

  async getStatistics(userId: string): Promise<NotificationStatistics> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [unread, today, thisWeek, thisMonth, archived, deliveryGroups] = await Promise.all([
      this.db.notification.count({ where: { userId, readAt: null, archivedAt: null } }),
      this.db.notification.count({ where: { userId, createdAt: { gte: startOfToday } } }),
      this.db.notification.count({ where: { userId, createdAt: { gte: startOfWeek } } }),
      this.db.notification.count({ where: { userId, createdAt: { gte: startOfMonth } } }),
      this.db.notification.count({ where: { userId, archivedAt: { not: null } } }),
      this.db.notificationDelivery.groupBy({
        by: ["status"],
        where: { notification: { userId } },
        _count: { _all: true },
      }),
    ]);

    const deliveryCounts: Record<DeliveryStatus, number> = {
      PENDING: 0,
      SENT: 0,
      FAILED: 0,
      SKIPPED: 0,
    };
    for (const row of deliveryGroups) deliveryCounts[row.status] = row._count._all;

    return {
      unread,
      today,
      thisWeek,
      thisMonth,
      archived,
      sent: deliveryCounts.SENT,
      failed: deliveryCounts.FAILED,
      pending: deliveryCounts.PENDING,
    };
  }

  // ==================== Phase 4D: إعدادات القنوات العامة + Quiet Hours + Digest ====================

  async getOrCreateChannelSettings(userId: string): Promise<ChannelSettingsRow> {
    const existing = await this.db.userNotificationSettings.findUnique({
      where: { userId },
      select: CHANNEL_SETTINGS_SELECT,
    });
    if (existing) return existing;

    return this.db.userNotificationSettings.create({
      data: { userId },
      select: CHANNEL_SETTINGS_SELECT,
    });
  }

  async updateChannelSettings(
    userId: string,
    data: UpdateChannelSettingsDto,
  ): Promise<ChannelSettingsRow> {
    return this.db.userNotificationSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      select: CHANNEL_SETTINGS_SELECT,
    });
  }

  /**
   * دفعة واحدة لعدة مستخدمين (Dispatch) - بلا N+1. غياب الصف لمستخدم يعني
   * DEFAULT_CHANNEL_SETTINGS (المستدعي يطبّقها بنفسه عبر Map.get بلا قيمة)
   */
  async findChannelSettingsForUsers(
    userIds: readonly string[],
  ): Promise<Map<string, ChannelSettingsRow>> {
    const map = new Map<string, ChannelSettingsRow>();
    if (userIds.length === 0) return map;

    const rows = await this.db.userNotificationSettings.findMany({
      where: { userId: { in: [...userIds] } },
      select: { userId: true, ...CHANNEL_SETTINGS_SELECT },
    });
    for (const row of rows) {
      map.set(row.userId, row);
    }
    return map;
  }
}
