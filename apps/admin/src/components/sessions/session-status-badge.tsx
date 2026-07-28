import { Badge } from "@/components/ui/badge";

/**
 * الخادم يُرجع بـ GET /auth/sessions فقط الجلسات النشطة فعلياً
 * (findActiveSessions يستثني revokedAt/expiresAt المنقضية بالاستعلام
 * نفسه) - فكل صف بالقائمة "نشطة" حتماً بحكم شرط الجلب، لا حالة أخرى ممكنة
 * لتُعرض هنا؛ هذا Badge صادق (100% دقيق دائماً) لا Placeholder مُخترَع.
 */
export function SessionStatusBadge() {
  return <Badge className="border-transparent bg-success/15 text-success">نشطة</Badge>;
}
