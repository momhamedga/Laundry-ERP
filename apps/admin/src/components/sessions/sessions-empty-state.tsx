import { ShieldOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * حارس دفاعي - عملياً القائمة تحوي جلستك الحالية دائماً إن كانت متصفح
 * وSameSite Cookie سليمة. غير مُتوقَّع بالاستخدام الطبيعي، موجود لإغلاق
 * فجوة نظرية (مثلاً طلب API بلا كوكي refresh) بدل شاشة فارغة صامتة.
 */
export function SessionsEmptyState() {
  return (
    <EmptyState
      icon={ShieldOff}
      title="لا توجد جلسات نشطة"
      description="حاول إعادة تحميل الصفحة أو تسجيل الدخول من جديد"
    />
  );
}
