// ==================== Pagination ====================

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ==================== Sorting ====================

/** الحقول المسموح الترتيب بها - Whitelist صارمة */
export const SERVICE_SORTABLE_FIELDS = [
  "sortOrder",
  "name",
  "price",
  "createdAt",
] as const;
export type ServiceSortableField = (typeof SERVICE_SORTABLE_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

// ==================== Search ====================

export const MAX_SEARCH_LENGTH = 100;

// ==================== Business ====================

/** الحد الأقصى للسعر - حماية من أخطاء الإدخال */
export const MAX_PRICE = 1_000_000;

/** الحد الأقصى لمدة التنفيذ بالساعات (أسبوعان) */
export const MAX_ESTIMATED_HOURS = 336;
