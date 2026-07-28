import type { AuditAction, Prisma } from "@prisma/client";
import type { SafeUser } from "../auth/index.js";

/** بيانات الترقيم الموحدة في meta */
export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ListUsersResult {
  users: SafeUser[];
  meta: PaginationMeta;
}

/** تفاصيل مستخدم مع بياناته التشغيلية */
export interface UserDetails {
  user: SafeUser;
  /** آخر تسجيل دخول ناجح - من AuditLog */
  lastLoginAt: Date | null;
  /** عدد الجلسات النشطة (Refresh Tokens صالحة) */
  activeSessions: number;
}

/** سجل نشاط واحد من AuditLog */
export interface ActivityEntry {
  id: string;
  action: AuditAction;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}

export interface ActivityResult {
  activity: ActivityEntry[];
  meta: PaginationMeta;
}
