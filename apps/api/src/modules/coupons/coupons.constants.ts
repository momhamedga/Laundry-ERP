export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_SEARCH_LENGTH = 100;

export const COUPON_SORTABLE_FIELDS = ["createdAt", "usedCount", "code"] as const;
export const REDEMPTION_SORTABLE_FIELDS = ["createdAt", "discountAmount"] as const;
export const SORT_ORDERS = ["asc", "desc"] as const;
