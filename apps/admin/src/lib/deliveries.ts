import type { ListOrdersParams, OrderListRow } from "@/types/orders";

/**
 * نطاقات التسليم ومشتقّاتها.
 *
 * مفصولة عن المكوّن لتُختبَر بلا DOM: حدود اليوم وحساب المتبقّي منطقٌ يخطئ
 * بصمت — يومٌ يبدأ في التوقيت العالمي بدل المحلّي يُخفي طلبات الصباح الباكر عن
 * قائمة اليوم، ولا شيء في الواجهة يشي بذلك.
 */

/** مجالات العرض في شاشة التسليمات */
export type DeliveryRange = "today" | "overdue" | "upcoming";

/** حالة السداد كما تُعرَض في مرشّح الشاشة */
export type DeliveryPaymentFilter = "all" | "paid" | "unpaid";

/**
 * بداية اليوم ونهايته بالتوقيت المحلّي للجهاز.
 *
 * محلّي لا UTC: «اليوم» عند موظّف المغسلة هو يومه هو. القاهرة تسبق UTC بساعتين
 * أو ثلاث، فحدودٌ بتوقيت عالمي كانت ستُسقط تسليمات الصباح من القائمة أو تُدخل
 * تسليمات الغد فيها — والقائمة تبدو صحيحة في الحالتين.
 */
export function dayBounds(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * يترجم المجال المختار إلى معاملَي استعلام على الخادم.
 *
 * التصفية على الخادم لا في المتصفّح: جلب كل الطلبات ثم غربلتها تكلفةٌ تنمو مع
 * كل طلب يُنشأ، وتصير غير محتملة في مغسلة بآلاف الطلبات.
 */
export function rangeToParams(
  range: DeliveryRange,
  now: Date = new Date(),
): Pick<ListOrdersParams, "dueFrom" | "dueTo"> {
  const { start, end } = dayBounds(now);

  if (range === "today") {
    return { dueFrom: start.toISOString(), dueTo: end.toISOString() };
  }
  if (range === "overdue") {
    // كل ما استُحقّ قبل اليوم — بلا حدّ أدنى، فالمتأخّر شهراً متأخّر أيضاً
    return { dueTo: new Date(start.getTime() - 1).toISOString() };
  }
  // القادم: بعد نهاية اليوم
  return { dueFrom: new Date(end.getTime() + 1).toISOString() };
}

/** المتبقّي على الطلب — الإجمالي ناقص المدفوع، بلا قيم سالبة */
export function remainingOf(order: OrderListRow): number {
  const total = Number(order.total);
  const paid = Number(order.paidAmount);
  return Math.max(total - paid, 0);
}

/** هل سُدِّد الطلب بالكامل؟ */
export function isFullyPaid(order: OrderListRow): boolean {
  return remainingOf(order) <= 0;
}

/**
 * هل فات موعد تسليم هذا الطلب؟
 *
 * الطلب المُسلَّم أو الملغى ليس متأخّراً مهما مضى على تاريخه — تمييزه بالأحمر
 * يُغرق القائمة بتنبيهات لا فعل بعدها فتُتجاهَل كلّها.
 */
export function isOverdue(order: OrderListRow, now: Date = new Date()): boolean {
  if (order.status === "DELIVERED" || order.status === "CANCELLED") return false;
  return new Date(order.dueDate).getTime() < now.getTime();
}

/** هل يمكن تسليم هذا الطلب الآن؟ (دورة الحالة بالخادم: للأمام فقط) */
export function canMarkDelivered(order: OrderListRow): boolean {
  return order.status !== "DELIVERED" && order.status !== "CANCELLED";
}
