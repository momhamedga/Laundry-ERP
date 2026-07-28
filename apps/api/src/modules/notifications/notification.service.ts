import { NotificationType as NotificationTypeEnum } from "@prisma/client";
import type { NotificationChannel, NotificationType, Prisma } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { RequestContext } from "../auth/auth.types.js";
import {
  DELIVERY_BATCH_SIZE,
  MAX_DELIVERY_ATTEMPTS,
  MAX_CLEANUP_DAYS,
  MIN_CLEANUP_DAYS,
  NOTIFICATION_RECIPIENT_ROLES,
  QUIET_HOURS_RECHECK_MS,
  deliveryBackoffMs,
} from "./notification.constants.js";
import type {
  BulkActionDto,
  ListNotificationsQueryDto,
  UpdateChannelSettingsDto,
  UpdatePreferencesDto,
} from "./notification.dto.js";
import type { NotificationRepository } from "./notification.repository.js";
import { notificationSseHub } from "./notification.sse.js";
import { buildNotificationContent } from "./notification.templates.js";
import { isTargetedEvent } from "./notification.types.js";
import type {
  ChannelSettings,
  DeliveryDueRow,
  ListNotificationsResult,
  NotificationEvent,
  NotificationRow,
  NotificationStatistics,
  PreferenceMap,
  ProviderStatusMap,
  QueueStatus,
} from "./notification.types.js";
import {
  DEFAULT_CHANNEL_SETTINGS,
  DEFAULT_PREFERENCE_CHANNELS,
  EXTERNAL_CHANNELS,
  buildNotificationWhere,
  buildPaginationMeta,
  channelFlagKey,
  globalChannelKey,
  isWithinQuietHours,
  resolveContact,
  toSkipTake,
} from "./notification.utils.js";
import type { ChannelRegistry } from "./providers/channel-registry.js";

const ALL_CHANNELS: readonly NotificationChannel[] = ["IN_APP", ...EXTERNAL_CHANNELS];

export class NotificationService {
  constructor(
    private readonly repo: NotificationRepository,
    private readonly channels: ChannelRegistry,
  ) {}

  // ==================== Dispatch (المُنتِجون → هنا فقط) ====================

  /**
   * نقطة الدخول الوحيدة لتوليد إشعار من حدث عمل. تُستدعى حصراً من مستمع
   * notification.bus (راجع index.ts) - لا تُستدعى مباشرة من وحدات العمل.
   * fire-safe بالكامل: لا ترمي أبداً للأعلى - فشل الإشعار لا يُفشِل شيئاً آخر.
   */
  async dispatch(event: NotificationEvent): Promise<void> {
    try {
      const recipientIds = await this.resolveRecipients(event);
      if (recipientIds.length === 0) return;

      const content = buildNotificationContent(event);
      const data = (event.data as unknown) as Prisma.InputJsonValue;
      const isTest = event.type === "TEST";

      const [preferences, channelSettings] = await Promise.all([
        this.repo.findPreferencesForUsersAndType(recipientIds, event.type),
        this.repo.findChannelSettingsForUsers(recipientIds),
      ]);

      for (const userId of recipientIds) {
        const pref = preferences.get(userId) ?? DEFAULT_PREFERENCE_CHANNELS;
        const settings = channelSettings.get(userId) ?? DEFAULT_CHANNEL_SETTINGS;

        // قيد v1 موثَّق: تعطيل inApp (بالتفضيل أو بالمفتاح العام) يُسكت كل القنوات
        // لنفس النوع لهذا المستخدم - راجع notification.types.ts للتفاصيل
        if (!pref.inApp || !settings.globalInApp) continue;

        // TEST: لا صف تفضيل خاص به بتصميم (غير مُعرَّض بواجهة التفضيلات) -
        // البريد يُبنى على المفتاح العام فقط، بصرف النظر عن NotificationPreference
        // الغائبة دائماً لهذا النوع (راجع "القرارات المعمارية" بالتقرير)
        const externalChannels = isTest
          ? settings.globalEmail
            ? (["EMAIL"] as const)
            : []
          : EXTERNAL_CHANNELS.filter(
              (channel) => pref[channelFlagKey(channel)] && settings[globalChannelKey(channel)],
            );

        const notification = await this.repo.createWithDeliveries({
          userId,
          type: event.type,
          title: content.title,
          body: content.body,
          data,
          entityType: this.entityTypeFor(event.type),
          entityId: this.entityIdFor(event),
          externalChannels,
        });

        notificationSseHub.publish(userId, notification);
      }
    } catch (err) {
      console.error("[notifications] dispatch failed:", err);
    }
  }

  private async resolveRecipients(event: NotificationEvent): Promise<string[]> {
    if (isTargetedEvent(event)) {
      return [event.targetUserId];
    }
    const roles = NOTIFICATION_RECIPIENT_ROLES[event.type];
    const roleIds = await this.repo.findActiveUserIdsByRoles(roles);
    if (!event.extraUserIds || event.extraUserIds.length === 0) return roleIds;
    return [...new Set([...roleIds, ...event.extraUserIds])];
  }

  private entityTypeFor(type: NotificationType): string | null {
    switch (type) {
      case "ORDER_CREATED":
      case "ORDER_STATUS_CHANGED":
      case "ORDER_CANCELLED":
        return "Order";
      case "PAYMENT_RECEIVED":
      case "PAYMENT_REFUNDED":
      case "PAYMENT_CANCELLED":
        return "Payment";
      case "INVOICE_CREATED":
      case "INVOICE_SENT":
        return "Invoice";
      case "USER_CREATED":
      case "USER_DISABLED":
        return "User";
      case "LOW_STOCK":
      case "OUT_OF_STOCK":
      case "STOCK_ADJUSTED":
      case "BARCODE_GENERATED":
      case "LOW_STOCK_SCANNED":
        return "InventoryItem";
      case "PURCHASE_RECEIVED":
      case "PURCHASE_CANCELLED":
        return "Purchase";
      case "LABEL_PRINTED":
      case "INVALID_SCAN":
        return null;
      case "POINTS_EARNED":
      case "POINTS_REDEEMED":
      case "POINTS_EXPIRED":
      case "MEMBERSHIP_UPGRADED":
      case "MEMBERSHIP_DOWNGRADED":
        return "Customer";
      case "COUPON_CREATED":
      case "COUPON_EXPIRED":
      case "COUPON_USED":
        return "Coupon";
      case "DAY_OPENED":
      case "DAY_CLOSED":
      case "DAY_REOPENED":
        return "DayClosing";
      case "BACKUP_COMPLETED":
      case "BACKUP_FAILED":
      case "SYSTEM_SETTINGS_UPDATED":
      case "NEW_DEVICE_LOGIN":
      case "ACCOUNT_LOCKED":
      case "PASSWORD_RESET":
      case "TEST":
        return null;
    }
  }

  private entityIdFor(event: NotificationEvent): string | null {
    switch (event.type) {
      case "ORDER_CREATED":
      case "ORDER_STATUS_CHANGED":
      case "ORDER_CANCELLED":
        return event.data.orderId;
      case "PAYMENT_RECEIVED":
      case "PAYMENT_REFUNDED":
      case "PAYMENT_CANCELLED":
        return event.data.paymentId;
      case "INVOICE_CREATED":
      case "INVOICE_SENT":
        return event.data.invoiceId;
      case "USER_CREATED":
      case "USER_DISABLED":
        return event.data.userId;
      case "LOW_STOCK":
      case "OUT_OF_STOCK":
      case "STOCK_ADJUSTED":
      case "BARCODE_GENERATED":
      case "LOW_STOCK_SCANNED":
        return event.data.itemId;
      case "PURCHASE_RECEIVED":
      case "PURCHASE_CANCELLED":
        return event.data.purchaseId;
      case "LABEL_PRINTED":
      case "INVALID_SCAN":
        return null;
      case "POINTS_EARNED":
      case "POINTS_REDEEMED":
      case "POINTS_EXPIRED":
      case "MEMBERSHIP_UPGRADED":
      case "MEMBERSHIP_DOWNGRADED":
        return event.data.customerId;
      case "COUPON_CREATED":
      case "COUPON_EXPIRED":
      case "COUPON_USED":
        return null;
      case "DAY_OPENED":
      case "DAY_CLOSED":
      case "DAY_REOPENED":
        return event.data.dayClosingId;
      case "BACKUP_COMPLETED":
      case "BACKUP_FAILED":
      case "SYSTEM_SETTINGS_UPDATED":
      case "NEW_DEVICE_LOGIN":
      case "ACCOUNT_LOCKED":
      case "PASSWORD_RESET":
      case "TEST":
        return null;
    }
  }

  // ==================== قراءة/إدارة إشعارات المستخدم الحالي ====================

  async list(userId: string, query: ListNotificationsQueryDto): Promise<ListNotificationsResult> {
    const where = buildNotificationWhere(userId, query);
    const { skip, take } = toSkipTake(query.page, query.limit);
    const [notifications, total] = await this.repo.findManyWithCount(where, skip, take);
    return { notifications, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async getById(userId: string, id: string): Promise<NotificationRow> {
    const notification = await this.repo.findByIdForUser(id, userId);
    if (!notification) throw new ApiError(404, "Notification not found");
    return notification;
  }

  unreadCount(userId: string): Promise<number> {
    return this.repo.unreadCount(userId);
  }

  async markRead(userId: string, id: string): Promise<void> {
    const result = await this.repo.markRead(id, userId);
    if (result.count === 0) throw new ApiError(404, "Notification not found");
  }

  async markUnread(userId: string, id: string): Promise<void> {
    const result = await this.repo.markUnread(id, userId);
    if (result.count === 0) throw new ApiError(404, "Notification not found");
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.markAllRead(userId);
  }

  async archive(userId: string, id: string): Promise<void> {
    const result = await this.repo.archive(id, userId);
    if (result.count === 0) throw new ApiError(404, "Notification not found");
  }

  async unarchive(userId: string, id: string): Promise<void> {
    const result = await this.repo.unarchive(id, userId);
    if (result.count === 0) throw new ApiError(404, "Notification not found");
  }

  async delete(userId: string, id: string): Promise<void> {
    const result = await this.repo.delete(id, userId);
    if (result.count === 0) throw new ApiError(404, "Notification not found");
  }

  async bulkAction(userId: string, dto: BulkActionDto): Promise<{ affected: number }> {
    const affected = await this.repo.bulkAction(userId, dto);
    return { affected };
  }

  // ==================== تفضيلات المستخدم ====================

  async getPreferences(userId: string): Promise<PreferenceMap> {
    const stored = await this.repo.findPreferences(userId);
    const result = {} as PreferenceMap;
    for (const type of Object.values(NotificationTypeEnum)) {
      result[type] = stored.get(type) ?? DEFAULT_PREFERENCE_CHANNELS;
    }
    return result;
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
    ctx: RequestContext,
  ): Promise<PreferenceMap> {
    const entries = Object.entries(dto) as [NotificationType, UpdatePreferencesDto[NotificationType]][];
    for (const [type, channels] of entries) {
      if (!channels) continue;
      await this.repo.upsertPreference(userId, type, channels);
    }

    await this.repo.createAuditLog({
      action: "NOTIFICATION_PREFERENCES_UPDATED",
      userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { changes: dto },
    });

    return this.getPreferences(userId);
  }

  // ==================== Scheduler (Outbox Worker) ====================

  /** يُستدعى دورياً من notification.scheduler.ts - يعالج دفعة واحدة من صفوف Outbox المستحقة */
  async processDueDeliveries(): Promise<void> {
    const due = await this.repo.findDueDeliveries(DELIVERY_BATCH_SIZE);
    for (const delivery of due) {
      await this.processOneDelivery(delivery);
    }
  }

  private async processOneDelivery(delivery: DeliveryDueRow): Promise<void> {
    // Quiet Hours: IN_APP لا يمر من هنا أصلاً (بلا صف Outbox) فيعمل دائماً كما هو مطلوب.
    // القنوات الخارجية فقط تُؤجَّل - PENDING بلا زيادة attempts، تُعاد مراجعتها لاحقاً
    // (لا حساب دقيق للحظة الانتهاء - بلا مكتبة توقيت، إعادة فحص دورية كافية وأبسط)
    const settings = delivery.notification.user.notificationSettings;
    if (settings && isWithinQuietHours(settings)) {
      await this.repo.deferDelivery(delivery.id, new Date(Date.now() + QUIET_HOURS_RECHECK_MS));
      return;
    }

    const provider = this.channels.get(delivery.channel);

    if (!provider || !provider.configured) {
      await this.repo.markDeliverySkipped(delivery.id, "Provider not configured");
      return;
    }

    const contact = resolveContact(delivery.channel, delivery.notification.user);
    if (!contact) {
      await this.repo.markDeliverySkipped(delivery.id, "No contact info for channel");
      return;
    }

    try {
      await provider.send({
        to: contact,
        title: delivery.notification.title,
        body: delivery.notification.body,
      });
      await this.repo.markDeliverySent(delivery.id);
    } catch (err) {
      const attempts = delivery.attempts + 1;
      const message = err instanceof Error ? err.message : String(err);
      if (attempts >= MAX_DELIVERY_ATTEMPTS) {
        await this.repo.markDeliveryFailedTerminal(delivery.id, attempts, message);
      } else {
        const nextAttemptAt = new Date(Date.now() + deliveryBackoffMs(attempts));
        await this.repo.rescheduleDelivery(delivery.id, attempts, message, nextAttemptAt);
      }
    }
  }

  // ==================== Phase 4D: القنوات العامة + Quiet Hours + Digest ====================

  async getChannelSettings(userId: string): Promise<ChannelSettings> {
    return this.repo.getOrCreateChannelSettings(userId);
  }

  /**
   * quietHoursEnabled=true يتطلب Start/End حقيقيَين - بعد الدمج مع القيم
   * المخزَّنة حالياً (الحمولة قد تكون جزئية: تفعيل فقط بلا إعادة إرسال الوقتين
   * المُخزَّنين من قبل - راجع الملاحظة بـ notification.validator.ts)
   */
  async updateChannelSettings(
    userId: string,
    dto: UpdateChannelSettingsDto,
    ctx: RequestContext,
  ): Promise<ChannelSettings> {
    const current = await this.repo.getOrCreateChannelSettings(userId);
    const merged = { ...current, ...dto };

    if (merged.quietHoursEnabled && (!merged.quietHoursStart || !merged.quietHoursEnd)) {
      throw new ApiError(
        400,
        "quietHoursStart and quietHoursEnd are required when quietHoursEnabled is true",
      );
    }

    const updated = await this.repo.updateChannelSettings(userId, dto);

    await this.repo.createAuditLog({
      action: "NOTIFICATION_PREFERENCES_UPDATED",
      userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { changes: dto, scope: "channel-settings" },
    });

    return updated;
  }

  /** يُرسِل مباشرة (بلا مرور بـ notificationBus) - إجراء ذاتي فوري، ليس حدث عمل عاماً */
  async sendTestNotification(userId: string): Promise<void> {
    const settings = await this.repo.getOrCreateChannelSettings(userId);
    const content = buildNotificationContent({ type: "TEST", data: {}, targetUserId: userId });

    if (!settings.globalInApp) {
      throw new ApiError(400, "In-App notifications are globally disabled for this account");
    }

    const externalChannels: NotificationChannel[] = settings.globalEmail ? ["EMAIL"] : [];

    const notification = await this.repo.createWithDeliveries({
      userId,
      type: "TEST",
      title: content.title,
      body: content.body,
      data: undefined,
      entityType: null,
      entityId: null,
      externalChannels,
    });

    notificationSseHub.publish(userId, notification);
  }

  /** الحالة الحقيقية من ChannelRegistry نفسه - IN_APP مُهيَّأ دائماً (لا اعتماد خارجي) */
  getProviderStatus(): ProviderStatusMap {
    const status = {} as ProviderStatusMap;
    for (const channel of ALL_CHANNELS) {
      const provider = this.channels.get(channel);
      status[channel] = { configured: channel === "IN_APP" ? true : (provider?.configured ?? false) };
    }
    return status;
  }

  getQueueStatus(): Promise<QueueStatus> {
    return this.repo.getQueueStatus();
  }

  async retryFailedDeliveries(): Promise<{ affected: number }> {
    const affected = await this.repo.retryFailedDeliveries();
    return { affected };
  }

  async clearOldNotifications(olderThanDays: number): Promise<{ deleted: number }> {
    if (olderThanDays < MIN_CLEANUP_DAYS || olderThanDays > MAX_CLEANUP_DAYS) {
      throw new ApiError(
        400,
        `olderThanDays must be between ${MIN_CLEANUP_DAYS} and ${MAX_CLEANUP_DAYS}`,
      );
    }
    const deleted = await this.repo.deleteOlderThan(olderThanDays);
    return { deleted };
  }

  getStatistics(userId: string): Promise<NotificationStatistics> {
    return this.repo.getStatistics(userId);
  }
}
