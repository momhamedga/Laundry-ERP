import { offlineApi } from "@/lib/offline-router";
import type { LocalPayment } from "@/lib/offline-types";
import type { CreatePaymentInput, Payment } from "@/types/payment";

/**
 * تسجيل دفعة في القاعدة المحلّية حين تتعذّر قاعدة البيانات.
 *
 * هذه كتابة مالية لا قراءة: المستودع المحلّي يُدرِجها في طابور المزامنة
 * ضمن المعاملة نفسها، فإمّا تُحفظ الدفعة وتُسجَّل للرفع معاً أو لا يحدث
 * أيّ منهما — لا حالة وسطى تُحصَّل فيها نقود ولا تصل الخادم.
 *
 * تُقيَّد بالحالة PENDING لا COMPLETED: الخادم هو من يعتمد الدفعة عند
 * المزامنة، وتقديم اعتماد لم يحدث بعدُ يجعل تقارير اليوم تعرض تحصيلاً
 * غير مؤكَّد.
 */
export async function createPaymentLocally(input: CreatePaymentInput): Promise<Payment> {
  const api = offlineApi();
  if (!api) throw new Error("الوضع دون اتصال غير متاح خارج تطبيق سطح المكتب");

  const local = await api.payments.create({
    order_id: input.orderId,
    amount: input.amount,
    method: input.method,
    reference: input.reference ?? undefined,
  });

  return toPayment(local);
}

/**
 * يحوّل صفّ SQLite إلى شكل Payment.
 *
 * المبالغ نصوص لأن الخادم يعيد Decimal كذلك حفاظاً على الدقّة، والواجهة
 * تتعامل معها على هذا الأساس في كل حساباتها.
 */
function toPayment(p: LocalPayment): Payment {
  return {
    id: p.id,
    orderId: p.order_id,
    amount: String(p.amount),
    method: p.method as Payment["method"],
    status: p.status as Payment["status"],
    reference: p.reference,
    createdAt: p.created_at,
  } as Payment;
}
