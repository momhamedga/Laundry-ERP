import type { PaginationMeta } from "@/types";

export type NotificationType =
  | "ORDER_CREATED"
  | "ORDER_STATUS_CHANGED"
  | "ORDER_CANCELLED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_CANCELLED"
  | "INVOICE_CREATED"
  | "INVOICE_SENT"
  | "BACKUP_COMPLETED"
  | "BACKUP_FAILED"
  | "NEW_DEVICE_LOGIN"
  | "ACCOUNT_LOCKED"
  | "PASSWORD_RESET"
  | "SYSTEM_SETTINGS_UPDATED"
  | "USER_CREATED"
  | "USER_DISABLED"
  /** إشعار اختباري يدوي فقط - لا صف تفضيل خاص به، غير مُدرَج بمصفوفة التفضيلات */
  | "TEST";

export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP" | "PUSH";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH";

export type NotificationStatusFilter = "unread" | "read" | "archived";

export type DigestMode = "INSTANT" | "HOURLY" | "DAILY" | "WEEKLY";

/** الإشعار كما يعيده الخادم */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  priority: NotificationPriority;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  userId: string;
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: NotificationType;
  status?: NotificationStatusFilter;
  dateFrom?: string;
  dateTo?: string;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
}

export interface ListNotificationsResult {
  notifications: NotificationItem[];
  meta: PaginationMeta;
}

export type BulkNotificationAction = "read" | "unread" | "archive" | "delete";

export interface BulkNotificationInput {
  ids: string[];
  action: BulkNotificationAction;
}

export interface NotificationPreferenceChannels {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
}

export type NotificationPreferenceMap = Record<NotificationType, NotificationPreferenceChannels>;

// ==================== Phase 4D: القنوات العامة + Quiet Hours + Digest ====================

export interface ChannelSettings {
  globalInApp: boolean;
  globalEmail: boolean;
  globalSms: boolean;
  globalWhatsapp: boolean;
  globalPush: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTimezone: string;
  digestMode: DigestMode;
}

export type ProviderStatusMap = Record<NotificationChannel, { configured: boolean }>;

export interface QueueStatus {
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
  retries: number;
  lastProcessingAt: string | null;
}

export interface NotificationStatistics {
  unread: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  archived: number;
  sent: number;
  failed: number;
  pending: number;
}
