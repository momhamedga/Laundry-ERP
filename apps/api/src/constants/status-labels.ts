import type { OrderStatus, PaymentTxStatus } from "@prisma/client";

/**
 * تسميات عربية للحالات، مخصّصة لنصوص الأخطاء التي تصل للمستخدم النهائي.
 *
 * رسالة مثل «الطلب DELIVERED ولا يمكن تعديله» تخلط لغتين وتعرض قيمة قاعدة
 * بيانات خاماً على موظّف الاستقبال، فتُقرأ كعطل لا كقاعدة عمل.
 *
 * ملاحظة مقصودة: قوالب الإشعارات (notification.templates.ts) وتقارير التصدير
 * وإيصال الدفع تحتفظ بنسخها المحلية — قاعدة صريحة من مرحلة 4B تقضي بأن يكون
 * ملف القالب هو المصدر الوحيد لنصّه. هذا الملف يخدم طبقة الأخطاء وحدها.
 */
export const ORDER_STATUS_AR: Record<OrderStatus, string> = {
  RECEIVED: "مستلم",
  INSPECTING: "فحص",
  WASHING: "غسيل",
  DRYING: "تجفيف",
  IRONING: "كي",
  PACKING: "تغليف",
  READY: "جاهز",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي",
};

export const PAYMENT_STATUS_AR: Record<PaymentTxStatus, string> = {
  PENDING: "معلّقة",
  COMPLETED: "مكتملة",
  FAILED: "فاشلة",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
};
