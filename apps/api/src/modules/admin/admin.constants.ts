import type { AuditAction } from "@prisma/client";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const RECENT_EVENTS_LIMIT = 10;

/** أحداث التدقيق المتعلّقة بالأمان/الدخول - مصدر "سجل الدخول" */
export const LOGIN_AUDIT_ACTIONS: readonly AuditAction[] = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGOUT",
  "ACCOUNT_LOCKED",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "SESSION_REVOKED",
  "TOKEN_REUSE_DETECTED",
  "USER_FORCE_LOGOUT",
];
