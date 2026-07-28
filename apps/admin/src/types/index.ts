import type { LucideIcon } from "lucide-react";

// ==================== Auth ====================

export type UserRole = "ADMIN" | "MANAGER" | "CASHIER" | "WORKER" | "DELIVERY";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
}

// ==================== Navigation ====================

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

// ==================== Dashboard (UI-level) ====================

export interface RevenuePoint {
  date: string;
  revenue: number;
}

// ==================== API Envelope ====================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
}

/** استجابة قائمة مرقّمة من الخادم */
export interface ApiListResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta: PaginationMeta;
}

// ==================== Pagination / Sorting (عامة لكل الوحدات) ====================

export type SortOrder = "asc" | "desc";

export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
