import type { User, UserRole } from "@prisma/client";

/** المستخدم المرفق بالطلب بعد التحقق من الـ JWT */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  branchId: string | null;
  /** Phase 9.6c - الصلاحيات الفعلية (الدور + التجاوزات)؛ غيابها يعني رجوع لخريطة الدور */
  permissions?: readonly string[];
  /** Phase 9.6c - معرّف المدير المنتحِل عند جلسة انتحال، وإلا null/غياب */
  impersonatedBy?: string | null;
}

/** المستخدم الآمن للإرجاع للعميل - بدون أي حقول حساسة */
export type SafeUser = Omit<
  User,
  | "passwordHash"
  | "failedLoginAttempts"
  | "lockedUntil"
  | "resetTokenHash"
  | "resetTokenExpiresAt"
>;

/** سياق الطلب للتدقيق وإدارة الجلسات */
export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

/** زوج التوكينات الناتج عن Login / Refresh */
export interface TokenPair {
  accessToken: string;
  /** يُرسل كـ HttpOnly Cookie - لا يظهر في الـ body */
  refreshToken: string;
  accessTokenExpiresInSec: number;
}

export interface LoginResult {
  user: SafeUser;
  tokens: TokenPair;
}

/** جلسة نشطة (Refresh Token غير ملغي وغير منتهي) */
export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  expiresAt: Date;
  /** هل هي الجلسة الحالية للطلب؟ */
  current: boolean;
}
