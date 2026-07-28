// ==================== Pagination ====================

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ==================== Sorting ====================

/** الحقول المسموح الترتيب بها - Whitelist صارمة */
export const PAYMENT_SORTABLE_FIELDS = ["createdAt", "amount"] as const;
export type PaymentSortableField = (typeof PAYMENT_SORTABLE_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

// ==================== Search ====================

export const MAX_SEARCH_LENGTH = 100;

// ==================== Business ====================

/** الحد الأقصى لمبلغ الدفعة الواحدة - حماية من أخطاء الإدخال */
export const MAX_PAYMENT_AMOUNT = 1_000_000;

export const MAX_NOTES_LENGTH = 500;
export const MAX_REFERENCE_LENGTH = 100;

/**
 * Policy: هل يُسمح بتعديل دفعة مكتملة؟
 * القرار المعماري: لا - الدفعة المكتملة سجل مالي ثابت،
 * التصحيح يتم عبر Refund ودفعة جديدة (Audit Trail سليم)
 */
export const ALLOW_COMPLETED_PAYMENT_EDIT = false;
