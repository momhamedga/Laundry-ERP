import type { OrderStatus } from "@prisma/client";

// ==================== Pagination ====================

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ==================== Sorting ====================

/** الحقول المسموح الترتيب بها - Whitelist صارمة */
export const ORDER_SORTABLE_FIELDS = [
  "receivedAt",
  "dueDate",
  "total",
  "orderNumber",
  "createdAt",
] as const;
export type OrderSortableField = (typeof ORDER_SORTABLE_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

// ==================== Search ====================

export const MAX_SEARCH_LENGTH = 100;

// ==================== Order Number ====================

/** صيغة رقم الطلب: ORD-YYYY-000001 */
export const ORDER_NUMBER_PREFIX = "ORD";
export const ORDER_NUMBER_SEQ_LENGTH = 6;
export const ORDER_NUMBER_REGEX = /^ORD-\d{4}-\d{6}$/;

/** محاولات إعادة التوليد عند تصادم الرقم (سباق نادر) */
export const ORDER_NUMBER_MAX_RETRIES = 3;

// ==================== Lifecycle ====================

/**
 * خط سير الطلب بالترتيب - الانتقال للأمام فقط (يسمح بالقفز
 * فوق مراحل غير مطلوبة مثل الكي لطلب غسيل فقط)
 */
export const ORDER_STATUS_FLOW: readonly OrderStatus[] = [
  "RECEIVED",
  "INSPECTING",
  "WASHING",
  "DRYING",
  "IRONING",
  "PACKING",
  "READY",
  "DELIVERED",
] as const;

/** حالات نهائية - لا تعديل ولا انتقال بعدها */
export const TERMINAL_STATUSES: readonly OrderStatus[] = [
  "DELIVERED",
  "CANCELLED",
] as const;

// ==================== Limits ====================

export const MAX_ORDER_ITEMS = 100;
export const MAX_ITEM_QUANTITY = 10_000;
export const MAX_NOTES_LENGTH = 1000;
