import { UserX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * حارس دفاعي - GET /users/profile يعيد بيانات المستخدم المسجَّل دائماً طالما
 * التوكن صالح (401 يُعالَج قبل الوصول هنا عبر AuthGuard)، لذا هذه الحالة لا
 * يُفترض حدوثها عملياً؛ موجودة فقط لإغلاق فجوة نظرية بدل شاشة فارغة صامتة
 */
export function ProfileEmptyState() {
  return (
    <EmptyState
      icon={UserX}
      title="تعذر العثور على بيانات الملف الشخصي"
      description="حاول إعادة تحميل الصفحة"
    />
  );
}
