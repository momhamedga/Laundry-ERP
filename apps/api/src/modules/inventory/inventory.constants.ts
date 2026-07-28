export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_SEARCH_LENGTH = 100;

/** حقول ترتيب أصناف المخزون - Whitelist */
export const ITEM_SORTABLE_FIELDS = ["createdAt", "name", "sku", "quantity"] as const;
export type ItemSortableField = (typeof ITEM_SORTABLE_FIELDS)[number];

/** حقول ترتيب الحركات */
export const MOVEMENT_SORTABLE_FIELDS = ["createdAt", "quantity"] as const;

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/** أنواع الحركة المسموحة في نقطة الحركة العامة (ADJUSTMENT/TRANSFER لهما مساران خاصان) */
export const GENERIC_MOVEMENT_TYPES = [
  "IN",
  "OUT",
  "RETURN",
  "LOSS",
  "OPENING",
  "CLOSING",
] as const;
export type GenericMovementType = (typeof GENERIC_MOVEMENT_TYPES)[number];

/** الأنواع التي تزيد الرصيد (البقية تُنقِص) */
export const INCREASING_TYPES = new Set(["IN", "RETURN", "OPENING"]);

/** أقصى عدد أصناف في جلسة جرد واحدة */
export const MAX_COUNT_LINES = 500;
