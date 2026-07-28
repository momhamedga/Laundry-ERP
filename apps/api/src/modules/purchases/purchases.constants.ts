export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_SEARCH_LENGTH = 100;

export const PURCHASE_SORTABLE_FIELDS = ["createdAt", "total", "status"] as const;
export type PurchaseSortableField = (typeof PURCHASE_SORTABLE_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const PURCHASE_NUMBER_PREFIX = "PUR";
export const PURCHASE_NUMBER_SEQ_LENGTH = 6;
export const PURCHASE_NUMBER_MAX_RETRIES = 5;

export const MAX_PURCHASE_ITEMS = 200;
