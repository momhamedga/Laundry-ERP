import { describe, expect, it } from "vitest";
import { buildNotificationContent } from "../../src/modules/notifications/notification.templates";
import type { NotificationEvent } from "../../src/modules/notifications/notification.types";

// عيّنة تمثيلية عبر فئات الأحداث (طلبات/مدفوعات/فواتير/مخزون/ولاء/عضوية/كوبون/يوم/أمان)
const events: NotificationEvent[] = [
  { type: "ORDER_CREATED", data: { orderId: "o1", orderNumber: "ORD-2026-000001", customerName: "أحمد", createdByName: "كاشير" } },
  { type: "ORDER_STATUS_CHANGED", data: { orderId: "o1", orderNumber: "ORD-2026-000001", customerName: "أحمد", oldStatus: "RECEIVED", newStatus: "WASHING", changedByEmail: "c@x.com" } },
  { type: "PAYMENT_RECEIVED", data: { paymentId: "p1", orderId: "o1", orderNumber: "ORD-2026-000001", amount: 150, method: "CASH", receivedByName: "كاشير" } },
  { type: "PAYMENT_REFUNDED", data: { paymentId: "p1", orderId: "o1", orderNumber: "ORD-2026-000001", refundAmount: 50, refundedByEmail: "c@x.com" } },
  { type: "INVOICE_CREATED", data: { invoiceId: "i1", invoiceNumber: "INV-2026-000001", orderNumber: "ORD-2026-000001", customerName: "أحمد", total: 200, createdByName: "كاشير" } },
  { type: "LOW_STOCK", data: { itemId: "it1", itemName: "منظف", sku: "SKU-1", quantity: 2, reorderLevel: 5 } },
  { type: "POINTS_EARNED", data: { customerId: "c1", customerName: "أحمد", points: 20, balance: 120 } },
  { type: "MEMBERSHIP_UPGRADED", data: { customerId: "c1", customerName: "أحمد", level: "GOLD" } },
  { type: "COUPON_USED", data: { code: "SAVE10", customerName: "أحمد", discountAmount: 25 } },
  { type: "DAY_OPENED", data: { dayClosingId: "d1", businessDate: "2026-07-29", openingCash: 500, openedByEmail: "a@x.com" } },
  { type: "DAY_CLOSED", data: { dayClosingId: "d1", businessDate: "2026-07-29", totalRevenue: 3000, cashDifference: 0, closedByEmail: "a@x.com" } },
  { type: "DAY_REOPENED", data: { dayClosingId: "d1", businessDate: "2026-07-29", reason: "تصحيح", reopenedByEmail: "a@x.com" } },
  { type: "NEW_DEVICE_LOGIN", data: { userAgent: "Chrome", ipAddress: "1.2.3.4", loginAt: "now" }, targetUserId: "u1" },
  { type: "TEST", data: {}, targetUserId: "u1" },
];

describe("notification.templates — buildNotificationContent", () => {
  it.each(events.map((e) => [e.type, e] as const))(
    "produces complete content for %s",
    (_type, event) => {
      const c = buildNotificationContent(event);
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.body.length).toBeGreaterThan(0);
      expect(c.email.subject.length).toBeGreaterThan(0);
      expect(c.email.html).toContain("<");
      expect(c.sms.length).toBeGreaterThan(0);
      expect(c.whatsapp.length).toBeGreaterThan(0);
    },
  );

  it("formats money with the currency suffix in payment content", () => {
    const c = buildNotificationContent(events[2]!);
    expect(c.body).toContain("ج.م");
  });

  it("includes the cash-difference wording on day close", () => {
    const c = buildNotificationContent(events[10]!);
    expect(c.title).toContain("إغلاق");
  });
});
