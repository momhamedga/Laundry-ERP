import type { UserRole } from "@/types";
import type { Permission } from "@/constants/permissions";

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

export interface SecurityCenter {
  users: {
    total: number;
    active: number;
    inactive: number;
    locked: number;
    byRole: Record<UserRole, number>;
  };
  sessions: { active: number; users: number };
  logins: { successLast24h: number; failedLast24h: number; failedLast7d: number };
  recentEvents: LoginHistoryEntry[];
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

export interface PermissionMatrix {
  permissions: Permission[];
  roles: UserRole[];
  matrix: Record<UserRole, Permission[]>;
}

export interface ForceLogoutInput {
  scope: "user" | "branch" | "all";
  userId?: string;
  branchId?: string;
}

export interface ForceLogoutResult {
  revoked: number;
  scope: "user" | "branch" | "all";
}

export interface ListLoginHistoryParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
