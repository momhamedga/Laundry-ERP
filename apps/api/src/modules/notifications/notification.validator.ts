import { DigestMode, NotificationChannel, NotificationPriority, NotificationType } from "@prisma/client";
import { z } from "zod";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_BULK_IDS,
  MAX_CLEANUP_DAYS,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  MIN_CLEANUP_DAYS,
} from "./notification.constants.js";

// ==================== Params ====================

export const notificationIdParamSchema = z.object({
  id: z.cuid("Invalid notification id"),
});

// ==================== Query ====================

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  type: z.enum(NotificationType).optional(),
  status: z.enum(["unread", "read", "archived"]).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  /** Phase 4D - اختياريان، إضافة بلا كسر أي مستهلك حالي للاستعلام */
  priority: z.enum(NotificationPriority).optional(),
  channel: z.enum(NotificationChannel).optional(),
});

/** Phase 4D - GET /notifications/queue/retry-failed لا Body، DELETE /notifications/cleanup */
export const cleanupQuerySchema = z.object({
  olderThanDays: z.coerce.number().int().min(MIN_CLEANUP_DAYS).max(MAX_CLEANUP_DAYS),
});

// ==================== Body ====================

export const bulkActionSchema = z.object({
  ids: z.array(z.cuid()).min(1).max(MAX_BULK_IDS),
  action: z.enum(["read", "unread", "archive", "delete"]),
});

const channelFlagsSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
  sms: z.boolean(),
  whatsapp: z.boolean(),
  push: z.boolean(),
});

/**
 * تحديث تفضيلات الإشعارات - خريطة جزئية (نوع → قنوات) - partialRecord يسمح
 * بإرسال نوع واحد أو أكثر فقط بلا الحاجة لإرسال كل الأنواع السبعة معاً
 */
export const updatePreferencesSchema = z.partialRecord(
  z.enum(NotificationType),
  channelFlagsSchema,
);

// ==================== Phase 4D: القنوات العامة + Quiet Hours + Digest ====================

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Intl.supportedValuesOf متاح Node 20+ (المشروع يتطلب >=20) - تحقّق حقيقي بلا مكتبة توقيت خارجية */
const IANA_TIMEZONES = new Set(Intl.supportedValuesOf("timeZone"));

export const updateChannelSettingsSchema = z
  .object({
    globalInApp: z.boolean(),
    globalEmail: z.boolean(),
    globalSms: z.boolean(),
    globalWhatsapp: z.boolean(),
    globalPush: z.boolean(),
    quietHoursEnabled: z.boolean(),
    quietHoursStart: z.string().regex(HHMM_REGEX, "Expected HH:mm").nullable(),
    quietHoursEnd: z.string().regex(HHMM_REGEX, "Expected HH:mm").nullable(),
    quietHoursTimezone: z.string().refine((tz) => IANA_TIMEZONES.has(tz), "Invalid IANA timezone"),
    digestMode: z.enum(DigestMode),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });
// ملاحظة: التحقق من "quietHoursStart/End مطلوبان إن كان quietHoursEnabled=true"
// يتم بالخدمة بعد الدمج مع القيم المخزَّنة حالياً - Zod هنا يرى الحمولة الجزئية
// فقط فلا يستطيع معرفة القيم القديمة (طلب يُفعِّل quietHoursEnabled فقط دون
// إرسال الوقتين مجدداً لأنهما مُخزَّنان من طلب سابق - سيناريو مشروع تماماً)
