import type { NotificationChannel, Prisma } from "@prisma/client";
import type { ListNotificationsQueryDto } from "./notification.dto.js";
import type {
  ChannelSettingsRow,
  PaginationMeta,
  PreferenceChannels,
} from "./notification.types.js";

// ==================== Pagination ====================

export function toSkipTake(page: number, limit: number): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ==================== Query Builder ====================

export function buildNotificationWhere(
  userId: string,
  query: Pick<
    ListNotificationsQueryDto,
    "search" | "type" | "status" | "dateFrom" | "dateTo" | "priority" | "channel"
  >,
): Prisma.NotificationWhereInput {
  const where: Prisma.NotificationWhereInput = { userId };

  if (query.search !== undefined) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { body: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.type !== undefined) where.type = query.type;
  if (query.priority !== undefined) where.priority = query.priority;
  // IN_APP ليس له صف Outbox (الإشعار نفسه هو تسليمه) - كل الإشعارات تُطابقه ضمنياً بلا شرط إضافي
  if (query.channel !== undefined && query.channel !== "IN_APP") {
    where.deliveries = { some: { channel: query.channel } };
  }

  // status: unread/read يستثنيان الأرشيف دائماً - الأرشيف تبويب منفصل صراحة
  if (query.status === "unread") {
    where.readAt = null;
    where.archivedAt = null;
  } else if (query.status === "read") {
    where.readAt = { not: null };
    where.archivedAt = null;
  } else if (query.status === "archived") {
    where.archivedAt = { not: null };
  } else {
    where.archivedAt = null; // الافتراضي: كل شيء ما عدا المؤرشف
  }

  if (query.dateFrom !== undefined || query.dateTo !== undefined) {
    where.createdAt = {
      ...(query.dateFrom !== undefined ? { gte: query.dateFrom } : {}),
      ...(query.dateTo !== undefined ? { lte: query.dateTo } : {}),
    };
  }

  return where;
}

// ==================== Preferences ====================

/**
 * الافتراضيات الآمنة عند غياب صف NotificationPreference لمستخدم/نوع:
 * IN_APP فقط مفعّل - القنوات الخارجية تتطلب تفعيلاً واعياً من المستخدم
 * (خصوصاً أن SMS/WhatsApp/Push بلا تكامل حقيقي بعد، وEmail بوضع اختبار Resend)
 */
export const DEFAULT_PREFERENCE_CHANNELS: PreferenceChannels = {
  inApp: true,
  email: false,
  sms: false,
  whatsapp: false,
  push: false,
};

export function channelFlagKey(channel: NotificationChannel): keyof PreferenceChannels {
  switch (channel) {
    case "IN_APP":
      return "inApp";
    case "EMAIL":
      return "email";
    case "SMS":
      return "sms";
    case "WHATSAPP":
      return "whatsapp";
    case "PUSH":
      return "push";
  }
}

/** جهة الاتصال الفعلية لقناة خارجية معيّنة - null يعني "لا بيانات كافية" (تُسكَّت بـ SKIPPED) */
export function resolveContact(
  channel: NotificationChannel,
  user: { email: string; phone: string | null },
): string | null {
  switch (channel) {
    case "EMAIL":
      return user.email;
    case "SMS":
    case "WHATSAPP":
      return user.phone;
    case "PUSH":
      return null; // لا بنية توكينات أجهزة بالمشروع بعد
    case "IN_APP":
      return null; // IN_APP لا يمر بصف Outbox أصلاً
  }
}

export const EXTERNAL_CHANNELS: readonly NotificationChannel[] = [
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "PUSH",
];

// ==================== Phase 4D: القنوات العامة + Quiet Hours ====================

/**
 * الافتراضي true للكل - عدم وجود صف لا يُغيِّر سلوك أي مستخدم حالي (بوابة إضافية
 * اختيارية فقط، تفعيلها الفعلي قرار واعٍ من المستخدم بإيقاف تشغيل مفتاح ما)
 */
export const DEFAULT_CHANNEL_SETTINGS: ChannelSettingsRow = {
  globalInApp: true,
  globalEmail: true,
  globalSms: true,
  globalWhatsapp: true,
  globalPush: true,
  quietHoursEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  quietHoursTimezone: "Africa/Cairo",
  digestMode: "INSTANT",
};

export function globalChannelKey(channel: NotificationChannel): keyof ChannelSettingsRow {
  switch (channel) {
    case "IN_APP":
      return "globalInApp";
    case "EMAIL":
      return "globalEmail";
    case "SMS":
      return "globalSms";
    case "WHATSAPP":
      return "globalWhatsapp";
    case "PUSH":
      return "globalPush";
  }
}

function toMinutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * "HH:mm" الحالية بتوقيت منطقة زمنية مُحدَّدة - بلا أي مكتبة تاريخ خارجية
 * (المشروع لا يعتمد أي مكتبة تاريخ إطلاقاً - Intl.DateTimeFormat وحده يكفي هنا)
 */
function currentHHMMInTimezone(timezone: string, now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

/**
 * هل الوقت الحالي داخل ساعات الهدوء؟ يدعم نطاقاً يمتد عبر منتصف الليل
 * (مثال: 22:00 → 07:00). لا يُستخدَم إلا عند إرسال قناة خارجية فعلياً -
 * IN_APP يعمل دائماً بصرف النظر (راجع notification.service.ts processOneDelivery)
 */
export function isWithinQuietHours(settings: ChannelSettingsRow, now = new Date()): boolean {
  if (!settings.quietHoursEnabled || !settings.quietHoursStart || !settings.quietHoursEnd) {
    return false;
  }

  const current = toMinutesSinceMidnight(currentHHMMInTimezone(settings.quietHoursTimezone, now));
  const start = toMinutesSinceMidnight(settings.quietHoursStart);
  const end = toMinutesSinceMidnight(settings.quietHoursEnd);

  if (start === end) return false; // نطاق صفري = بلا تأثير فعلي
  if (start < end) return current >= start && current < end;
  return current >= start || current < end; // يمتد عبر منتصف الليل
}
