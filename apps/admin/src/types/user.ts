import type { PaginationMeta, SortOrder, UserRole } from "@/types";

export type UserSortField = "createdAt" | "name" | "email" | "role";

/** المستخدم كما يعيده الخادم (SafeUser - بلا حقول حساسة) */
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  /** معرف الفرع فقط - الخادم لا يُضمِّن اسم الفرع بهذه الاستجابة */
  branchId: string | null;
}

export interface UserDetails {
  user: User;
  lastLoginAt: string | null;
  /** عدد الجلسات النشطة - الخادم لا يعيد قائمة جلسات مفصَّلة، فقط هذا العدد */
  activeSessions: number;
}

/** يطابق enum AuditAction بالخادم حرفياً - لا حاجة action لم يُغطَّ هنا حالياً */
export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "TOKEN_REFRESHED"
  | "TOKEN_REUSE_DETECTED"
  | "ACCOUNT_LOCKED"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "SESSION_REVOKED"
  | "PAYMENT_CREATED"
  | "PAYMENT_UPDATED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_CANCELLED";

export interface ActivityEntry {
  id: string;
  action: AuditAction;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  branchId?: string;
  sortBy?: UserSortField;
  sortOrder?: SortOrder;
}

export interface ListUsersResult {
  users: User[];
  meta: PaginationMeta;
}

export interface ActivityParams {
  page?: number;
  limit?: number;
}

export interface ActivityResult {
  activity: ActivityEntry[];
  meta: PaginationMeta;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  branchId?: string | null;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string | null;
  branchId?: string | null;
}
