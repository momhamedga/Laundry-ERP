export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_SEARCH_LENGTH = 100;

/** الحقول المسموح الترتيب بها - Whitelist صارمة */
export const SUPPLIER_SORTABLE_FIELDS = ["createdAt", "name"] as const;
export type SupplierSortableField = (typeof SUPPLIER_SORTABLE_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];
