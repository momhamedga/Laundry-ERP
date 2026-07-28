/**
 * جلسة نشطة كما يعيدها GET /auth/sessions - مطابق حرفياً لـ SessionInfo
 * بـ apps/api/src/modules/auth/auth.types.ts. القائمة تُرجَع مصفوفة خام بلا
 * PaginationMeta (لا صفحات بالخادم) - العدد المتوقع صغير عملياً دائماً.
 * لا lastActivity ولا location: غير موجودين بالخادم إطلاقاً.
 */
export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  /** هل هي جلسة الطلب الحالي (المتصفح المستخدَم الآن)؟ */
  current: boolean;
}
