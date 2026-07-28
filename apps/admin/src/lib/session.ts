/**
 * أعلام جلسة غير حساسة فقط - لا توكينات في أي تخزين
 * (Access Token في الذاكرة، Refresh في HttpOnly Cookie)
 */

const REMEMBER_KEY = "laundry-remember";
const SESSION_HINT_KEY = "laundry-session-hint";
/** مفتاح التخزين القديم من مرحلة الـ Foundation - يُمسح نهائياً */
const LEGACY_PERSIST_KEY = "laundry-auth";

const isBrowser = typeof window !== "undefined";

/** Remember Me: استعادة الجلسة حتى بعد إغلاق المتصفح */
export function getRememberFlag(): boolean {
  return isBrowser && localStorage.getItem(REMEMBER_KEY) === "1";
}

export function setRememberFlag(remember: boolean): void {
  if (!isBrowser) return;
  if (remember) localStorage.setItem(REMEMBER_KEY, "1");
  else localStorage.removeItem(REMEMBER_KEY);
}

/** جلسة نشطة في هذا التبويب (بدون Remember Me) */
export function hasSessionHint(): boolean {
  return isBrowser && sessionStorage.getItem(SESSION_HINT_KEY) === "1";
}

export function setSessionHint(): void {
  if (isBrowser) sessionStorage.setItem(SESSION_HINT_KEY, "1");
}

export function clearSessionHint(): void {
  if (isBrowser) sessionStorage.removeItem(SESSION_HINT_KEY);
}

/** إزالة أي توكينات قديمة مخزنة من مرحلة الـ Foundation (أمان) */
export function clearLegacyAuthStorage(): void {
  if (isBrowser) localStorage.removeItem(LEGACY_PERSIST_KEY);
}
