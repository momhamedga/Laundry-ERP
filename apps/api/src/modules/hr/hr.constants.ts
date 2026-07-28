export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** ساعة بدء العمل القياسية (لاحتساب التأخير) - HH:mm بتوقيت العمل */
export const STANDARD_START_HOUR = 9;
export const STANDARD_START_MINUTE = 0;
/** ساعات الدوام القياسية (لاحتساب العمل الإضافي) */
export const STANDARD_WORK_HOURS = 8;

/** عتبة تنبيه قرب انتهاء مستند (بالأيام) */
export const DOCUMENT_EXPIRY_WARN_DAYS = 30;

/** تاريخ اليوم عند منتصف ليل UTC (عمود @db.Date) بلا انزياح - نفس نمط day-closing */
export function todayDate(now: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** يحوّل Date إلى منتصف ليل UTC (لعمود @db.Date) */
export function toDateOnly(d: Date): Date {
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

/** فرق أيام شامل الطرفين */
export function inclusiveDays(start: Date, end: Date): number {
  const ms = toDateOnly(end).getTime() - toDateOnly(start).getTime();
  return Math.floor(ms / 86_400_000) + 1;
}
