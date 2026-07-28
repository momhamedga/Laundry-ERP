import type { UserRole } from "@prisma/client";
import type { Permission } from "../auth/index.js";

export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SessionView {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface LoginHistoryEntry {
  id: string;
  action: string;
  email: string | null;
  userId: string | null;
  userName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ListLoginHistoryResult {
  entries: LoginHistoryEntry[];
  meta: PaginationMeta;
}

export interface SecurityCenter {
  users: {
    total: number;
    active: number;
    inactive: number;
    locked: number;
    byRole: Record<UserRole, number>;
  };
  sessions: {
    active: number;
    users: number; // عدد المستخدمين ذوي جلسة نشطة
  };
  logins: {
    successLast24h: number;
    failedLast24h: number;
    failedLast7d: number;
  };
  recentEvents: LoginHistoryEntry[];
}

export interface PermissionMatrix {
  permissions: readonly Permission[];
  roles: UserRole[];
  matrix: Record<UserRole, readonly Permission[]>;
}

export interface ForceLogoutResult {
  revoked: number;
  scope: "user" | "branch" | "all";
}
