export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_SEARCH_LENGTH = 100;

export const ACCOUNT_SORTABLE_FIELDS = ["currentPoints", "lifetimePoints", "createdAt"] as const;
export const HISTORY_SORTABLE_FIELDS = ["createdAt", "points"] as const;
export const CAMPAIGN_SORTABLE_FIELDS = ["createdAt", "points"] as const;
export const SORT_ORDERS = ["asc", "desc"] as const;

/** حدّ أقصى لعدد الصفوف المعالَجة في تشغيل انتهاء النقاط الواحد */
export const MAX_EXPIRE_BATCH = 5000;
