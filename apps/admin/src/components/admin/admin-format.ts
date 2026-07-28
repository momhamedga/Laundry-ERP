import type { UserRole } from "@/types";

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "تسجيل دخول ناجح",
  LOGIN_FAILED: "محاولة دخول فاشلة",
  LOGOUT: "تسجيل خروج",
  ACCOUNT_LOCKED: "قفل حساب",
  PASSWORD_CHANGED: "تغيير كلمة المرور",
  PASSWORD_RESET_REQUESTED: "طلب إعادة تعيين",
  PASSWORD_RESET_COMPLETED: "إتمام إعادة التعيين",
  SESSION_REVOKED: "إنهاء جلسة",
  TOKEN_REUSE_DETECTED: "اكتشاف إعادة استخدام توكين",
  USER_FORCE_LOGOUT: "إخراج قسري",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "مدير النظام",
  MANAGER: "مدير فرع",
  CASHIER: "كاشير",
  WORKER: "عامل",
  DELIVERY: "مندوب توصيل",
};

/** نبرة صف الحدث - محاولات الفشل والقفل باللون التحذيري */
export function actionTone(action: string): "danger" | "normal" {
  return action === "LOGIN_FAILED" ||
    action === "ACCOUNT_LOCKED" ||
    action === "TOKEN_REUSE_DETECTED"
    ? "danger"
    : "normal";
}
