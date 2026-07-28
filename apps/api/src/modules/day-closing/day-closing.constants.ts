export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** عدد آخر عمليات الإغلاق المعروضة على اللوحة */
export const DASHBOARD_RECENT_LIMIT = 5;

/**
 * منطقة زمنية العمل لاشتقاق "تاريخ اليوم" (مفتاح businessDate فقط) - تُطابق
 * SystemSettings.defaultTimezone الافتراضية. لا تُستخدم في نافذة التجميع
 * (تلك زمنية فعلية [openedAt, toDate] بلا اعتماد على المنطقة).
 */
export const BUSINESS_TIMEZONE = "Africa/Cairo";

/**
 * يشتق تاريخ اليوم (YYYY-MM-DD) بمنطقة العمل بلا مكتبة توقيت (Intl فقط)،
 * ويُعيده كـ Date عند منتصف ليل UTC ليخزَّن في عمود @db.Date دون انزياح.
 */
export function businessDateFor(now: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** YYYY-MM-DD من Date (لعرض/مفاتيح) */
export function formatBusinessDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
