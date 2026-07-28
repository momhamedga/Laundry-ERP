import type { NotificationType, UserRole } from "@prisma/client";
import type { TargetedNotificationEvent } from "./notification.types.js";

// ==================== Pagination ====================

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ==================== Search / Bulk ====================

export const MAX_SEARCH_LENGTH = 100;
export const MAX_BULK_IDS = 100;

// ==================== Recipients ====================

/**
 * الأدوار المستقبِلة لكل نوع إشعار "عام" - تُستثنى الأنواع المُوجَّهة (NEW_DEVICE_LOGIN/
 * ACCOUNT_LOCKED/PASSWORD_RESET) لأن مستقبِلها دائماً المستخدم صاحب الحدث نفسه بصرف
 * النظر عن دوره، وتُحل مباشرة بالخدمة (راجع isTargetedEvent).
 *
 * ORDER_STATUS_CHANGED/ORDER_CANCELLED: القائمة هنا هي البثّ العام فقط (إشراف
 * ADMIN/MANAGER) - موظف الطلب نفسه يُضاف دائماً عبر extraUserIds بالحدث نفسه
 * بصرف النظر عن دوره (قرار مرحلة 4B - راجع notification.types.ts).
 */
export const NOTIFICATION_RECIPIENT_ROLES: Record<
  Exclude<NotificationType, TargetedNotificationEvent["type"]>,
  readonly UserRole[]
> = {
  ORDER_CREATED: ["ADMIN", "MANAGER"],
  ORDER_STATUS_CHANGED: ["ADMIN", "MANAGER"],
  ORDER_CANCELLED: ["ADMIN", "MANAGER"],
  PAYMENT_RECEIVED: ["ADMIN", "MANAGER", "CASHIER"],
  PAYMENT_REFUNDED: ["ADMIN", "MANAGER", "CASHIER"],
  PAYMENT_CANCELLED: ["ADMIN", "MANAGER", "CASHIER"],
  INVOICE_CREATED: ["ADMIN", "MANAGER", "CASHIER"],
  INVOICE_SENT: ["ADMIN", "MANAGER", "CASHIER"],
  BACKUP_COMPLETED: ["ADMIN"],
  BACKUP_FAILED: ["ADMIN"],
  SYSTEM_SETTINGS_UPDATED: ["ADMIN"],
  USER_CREATED: ["ADMIN"],
  USER_DISABLED: ["ADMIN"],
  LOW_STOCK: ["ADMIN", "MANAGER"],
  OUT_OF_STOCK: ["ADMIN", "MANAGER"],
  PURCHASE_RECEIVED: ["ADMIN", "MANAGER"],
  PURCHASE_CANCELLED: ["ADMIN", "MANAGER"],
  STOCK_ADJUSTED: ["ADMIN", "MANAGER"],
  BARCODE_GENERATED: ["ADMIN", "MANAGER"],
  LABEL_PRINTED: ["ADMIN", "MANAGER"],
  LOW_STOCK_SCANNED: ["ADMIN", "MANAGER"],
  INVALID_SCAN: ["ADMIN", "MANAGER"],
  POINTS_EARNED: ["ADMIN", "MANAGER"],
  POINTS_REDEEMED: ["ADMIN", "MANAGER"],
  POINTS_EXPIRED: ["ADMIN", "MANAGER"],
  MEMBERSHIP_UPGRADED: ["ADMIN", "MANAGER"],
  MEMBERSHIP_DOWNGRADED: ["ADMIN", "MANAGER"],
  COUPON_CREATED: ["ADMIN", "MANAGER"],
  COUPON_EXPIRED: ["ADMIN", "MANAGER"],
  COUPON_USED: ["ADMIN", "MANAGER"],
  DAY_OPENED: ["ADMIN", "MANAGER"],
  DAY_CLOSED: ["ADMIN", "MANAGER"],
  DAY_REOPENED: ["ADMIN", "MANAGER"],
};

// ==================== Delivery / Scheduler (Outbox - بلا Redis) ====================

/** دورة سحب صفوف Outbox المستحقة - داخل عملية الـ API نفسها */
export const SCHEDULER_INTERVAL_MS = 10_000;
export const DELIVERY_BATCH_SIZE = 25;
/** بعد هذا العدد من المحاولات الفاشلة تصبح FAILED نهائياً (تخرج من دورة السحب) */
export const MAX_DELIVERY_ATTEMPTS = 5;

/** Backoff تصاعدي بسيط: المحاولة رقم n تُعاد بعد n دقيقة، بحد أقصى 30 دقيقة */
export function deliveryBackoffMs(attempts: number): number {
  return Math.min(attempts, 30) * 60_000;
}

// ==================== SSE ====================

/** نبضة قلب دورية تمنع أي وسيط (proxy) من قطع الاتصال الخامل */
export const SSE_HEARTBEAT_MS = 20_000;

// ==================== Phase 4D ====================

/** إعادة جدولة صف Outbox المؤجَّل بسبب Quiet Hours - يُعاد فحصه بعد هذه المدة بدل حساب لحظة الانتهاء الدقيقة (لا مكتبة توقيت) */
export const QUIET_HOURS_RECHECK_MS = 15 * 60_000;

export const MIN_CLEANUP_DAYS = 1;
export const MAX_CLEANUP_DAYS = 3650;
