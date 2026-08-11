import { describe, expect, it } from "vitest";
import {
  canMarkDelivered,
  dayBounds,
  isFullyPaid,
  isOverdue,
  rangeToParams,
  remainingOf,
} from "@/lib/deliveries";
import type { OrderListRow } from "@/types/orders";

/**
 * منطق نطاقات التسليم ومشتقّاتها.
 *
 * هذا المنطق يخطئ بصمت: يومٌ يبدأ بالتوقيت العالمي بدل المحلّي يُخفي تسليمات
 * الصباح الباكر من قائمة اليوم، وقائمةٌ ناقصة تبدو صحيحة تماماً — لا خطأ ولا
 * تحذير، فقط طلبٌ لا يراه أحد حتى يتّصل صاحبه.
 */
function makeOrder(overrides: Partial<OrderListRow> = {}): OrderListRow {
  return {
    id: "o1",
    orderNumber: "ORD-2026-000001",
    status: "READY",
    paymentStatus: "UNPAID",
    subtotal: "500",
    discount: "0",
    total: "500",
    paidAmount: "0",
    notes: null,
    receivedAt: "2026-08-10T08:00:00.000Z",
    dueDate: "2026-08-11T18:00:00.000Z",
    deliveredAt: null,
    createdAt: "2026-08-10T08:00:00.000Z",
    updatedAt: "2026-08-10T08:00:00.000Z",
    customerId: "c1",
    branchId: "b1",
    createdById: "u1",
    customer: { id: "c1", name: "عميل", phone: "01000000000" },
    branch: { id: "b1", name: "الفرع" },
    _count: { items: 3 },
    ...overrides,
  } as OrderListRow;
}

describe("حدود اليوم", () => {
  it("تبدأ من منتصف الليل المحلّي وتنتهي بآخر لحظة فيه", () => {
    const { start, end } = dayBounds(new Date("2026-08-11T13:45:00"));

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    // اليوم نفسه لا اليوم التالي
    expect(start.getDate()).toBe(end.getDate());
  });

  it("تسليم في الساعة 00:30 محلياً يقع داخل اليوم", () => {
    const now = new Date("2026-08-11T13:00:00");
    const { start, end } = dayBounds(now);
    const earlyDelivery = new Date("2026-08-11T00:30:00");

    expect(earlyDelivery >= start && earlyDelivery <= end).toBe(true);
  });
});

describe("ترجمة النطاق إلى معاملات الخادم", () => {
  const now = new Date("2026-08-11T13:00:00");

  it("اليوم: نطاق مغلق من بدايته إلى نهايته", () => {
    const params = rangeToParams("today", now);

    expect(params.dueFrom).toBeDefined();
    expect(params.dueTo).toBeDefined();
    expect(new Date(params.dueFrom!) < new Date(params.dueTo!)).toBe(true);
  });

  it("المتأخّرة: بلا حدّ أدنى — المتأخّر شهراً متأخّر أيضاً", () => {
    const params = rangeToParams("overdue", now);

    expect(params.dueFrom).toBeUndefined();
    expect(new Date(params.dueTo!) < dayBounds(now).start).toBe(true);
  });

  it("القادمة: بعد نهاية اليوم بلا حدّ أعلى", () => {
    const params = rangeToParams("upcoming", now);

    expect(params.dueTo).toBeUndefined();
    expect(new Date(params.dueFrom!) > dayBounds(now).end).toBe(true);
  });

  it("النطاقات الثلاثة لا تتداخل ولا تترك ثغرة", () => {
    const today = rangeToParams("today", now);
    const overdue = rangeToParams("overdue", now);
    const upcoming = rangeToParams("upcoming", now);

    // نهاية المتأخّر = بداية اليوم ناقص ميلي ثانية واحدة
    expect(new Date(overdue.dueTo!).getTime() + 1).toBe(new Date(today.dueFrom!).getTime());
    // بداية القادم = نهاية اليوم زائد ميلي ثانية واحدة
    expect(new Date(today.dueTo!).getTime() + 1).toBe(new Date(upcoming.dueFrom!).getTime());
  });
});

describe("المتبقّي والسداد", () => {
  it("المتبقّي = الإجمالي ناقص المدفوع", () => {
    expect(remainingOf(makeOrder({ total: "500", paidAmount: "200" }))).toBe(300);
  });

  it("الدفع الزائد لا يُنتج متبقّياً سالباً", () => {
    expect(remainingOf(makeOrder({ total: "500", paidAmount: "600" }))).toBe(0);
  });

  it("المسدَّد بالكامل يُميَّز صحيحاً", () => {
    expect(isFullyPaid(makeOrder({ total: "500", paidAmount: "500" }))).toBe(true);
    expect(isFullyPaid(makeOrder({ total: "500", paidAmount: "499" }))).toBe(false);
  });
});

describe("التأخير", () => {
  const now = new Date("2026-08-11T12:00:00.000Z");

  it("موعدٌ فات ولم يُسلَّم ⇒ متأخّر", () => {
    expect(isOverdue(makeOrder({ dueDate: "2026-08-10T12:00:00.000Z" }), now)).toBe(true);
  });

  it("موعدٌ لم يحن بعد ⇒ غير متأخّر", () => {
    expect(isOverdue(makeOrder({ dueDate: "2026-08-12T12:00:00.000Z" }), now)).toBe(false);
  });

  it("المُسلَّم ليس متأخّراً مهما مضى على موعده", () => {
    const delivered = makeOrder({ dueDate: "2026-01-01T00:00:00.000Z", status: "DELIVERED" });
    expect(isOverdue(delivered, now)).toBe(false);
  });

  it("الملغى ليس متأخّراً — تنبيهٌ لا فعل بعده يُغرق القائمة", () => {
    const cancelled = makeOrder({ dueDate: "2026-01-01T00:00:00.000Z", status: "CANCELLED" });
    expect(isOverdue(cancelled, now)).toBe(false);
  });
});

describe("إتاحة التسليم — مطابقة لدورة الحالة بالخادم", () => {
  it("طلب جاهز يمكن تسليمه", () => {
    expect(canMarkDelivered(makeOrder({ status: "READY" }))).toBe(true);
  });

  it("طلب في مرحلة وسيطة يمكن تسليمه (القفز للأمام مسموح)", () => {
    expect(canMarkDelivered(makeOrder({ status: "IRONING" }))).toBe(true);
  });

  it("المُسلَّم والملغى حالتان نهائيتان — لا تسليم بعدهما", () => {
    expect(canMarkDelivered(makeOrder({ status: "DELIVERED" }))).toBe(false);
    expect(canMarkDelivered(makeOrder({ status: "CANCELLED" }))).toBe(false);
  });
});
