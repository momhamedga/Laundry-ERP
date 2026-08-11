/** ترقيم الصفحات - نفس حدود بقية الوحدات */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const MAX_SEARCH_LENGTH = 100;
export const MAX_NOTES_LENGTH = 500;
export const MAX_CANCEL_REASON_LENGTH = 300;

/**
 * أقصى مبلغ لمصروف واحد.
 *
 * ليس قيداً محاسبياً بل حاجزٌ ضد الخطأ المطبعي: صفرٌ زائد سهو يقلب تقرير الشهر
 * كلّه، والتصحيح بعد اكتشافه يتطلّب إلغاءً وإعادة تسجيل. والحدّ يبقى أعلى بكثير
 * من أي مصروف تشغيلي واقعي لمغسلة.
 */
export const MAX_EXPENSE_AMOUNT = 10_000_000;

/**
 * حقول الفرز المسموحة (قائمة بيضاء).
 *
 * تمرير اسم الحقل من الطلب مباشرةً إلى orderBy يسمح بالفرز على أي عمود، ومنها
 * أعمدة لا يجوز كشف ترتيبها. القائمة تُغلق ذلك، ويرفض z.enum ما عداها بـ400.
 */
export const EXPENSE_SORTABLE_FIELDS = ["expenseDate", "amount", "createdAt"] as const;
export type ExpenseSortableField = (typeof EXPENSE_SORTABLE_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];
