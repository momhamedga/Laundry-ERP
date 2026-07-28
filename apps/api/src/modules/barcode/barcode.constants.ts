export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_SEARCH_LENGTH = 100;

/** أقصى عدد أصناف في عملية توليد/طباعة جماعية واحدة */
export const MAX_BULK_ITEMS = 500;

/** أقصى عدد نسخ لملصق صنف واحد في طباعة واحدة */
export const MAX_LABEL_QUANTITY = 1000;

export const PRINT_HISTORY_SORTABLE_FIELDS = ["createdAt", "quantity"] as const;
export const SCAN_SORTABLE_FIELDS = ["createdAt"] as const;
export const SORT_ORDERS = ["asc", "desc"] as const;
