import type { OrderStatus } from "@prisma/client";

// ==================== Pagination ====================

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ==================== Sorting ====================

/** الحقول المسموح الترتيب بها - Whitelist صارمة */
export const CUSTOMER_SORTABLE_FIELDS = ["createdAt", "name", "phone"] as const;
export type CustomerSortableField = (typeof CUSTOMER_SORTABLE_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

// ==================== Search ====================

export const MAX_SEARCH_LENGTH = 100;

// ==================== Business ====================

/** الحالات التي يُعتبر فيها الطلب "نشطاً" (لم يُسلَّم ولم يُلغَ) */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  "RECEIVED",
  "INSPECTING",
  "WASHING",
  "DRYING",
  "IRONING",
  "PACKING",
  "READY",
] as const;

/** عدد الطلبات الأخيرة في Customer Profile */
export const PROFILE_RECENT_ORDERS = 10;
