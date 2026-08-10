import { AR_LOCALE } from "./locale";
/** يقبل رقماً أو نصاً (حقول Decimal تصل كنص من الخادم) */
export function formatCurrency(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;
  return `${amount.toLocaleString(AR_LOCALE, { maximumFractionDigits: 2 })} ج.م`;
}

export function formatDate(value: string | Date | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(AR_LOCALE, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | Date | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(AR_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });

/** وقت نسبي حي ("قبل 5 دقائق") - يتحول لتاريخ كامل بعد أسبوع لتفادي نص غير دقيق */
export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const diffAbs = Math.abs(diffSec);

  if (diffAbs < 60) return RELATIVE_TIME_FORMATTER.format(diffSec, "second");
  if (diffAbs < 3600) return RELATIVE_TIME_FORMATTER.format(Math.round(diffSec / 60), "minute");
  if (diffAbs < 86_400) return RELATIVE_TIME_FORMATTER.format(Math.round(diffSec / 3600), "hour");
  if (diffAbs < 604_800) return RELATIVE_TIME_FORMATTER.format(Math.round(diffSec / 86_400), "day");
  return formatDate(date);
}
