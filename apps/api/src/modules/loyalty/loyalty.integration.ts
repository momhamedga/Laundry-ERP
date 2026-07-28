import { couponsService } from "../coupons/index.js";
import { notificationBus } from "../notifications/index.js";
import type { LoyaltyService } from "./loyalty.service.js";

/**
 * تكامل الولاء مع دورة حياة الطلب عبر الـ bus القائم فقط (نمط Phase 4B) - صفر
 * تعديل على وحدتي orders/payments. مستمع ثانٍ على نفس الـ bus (EventEmitter يدعم
 * عدة مستمعين). كل معالج fire-and-forget داخل catch - فشله لا يؤثر على الطلب.
 */
export function registerLoyaltyIntegration(loyalty: LoyaltyService): void {
  notificationBus.onNotification((event) => {
    switch (event.type) {
      case "ORDER_CREATED":
        void loyalty
          .earnFromOrder(event.data.orderId)
          .catch((err: unknown) => console.error("[loyalty] earn failed:", err));
        break;
      case "ORDER_CANCELLED":
      case "PAYMENT_REFUNDED":
        void loyalty
          .reverseOrder(event.data.orderId)
          .catch((err: unknown) => console.error("[loyalty] reverse failed:", err));
        void couponsService
          .reverseByOrder(event.data.orderId)
          .catch((err: unknown) => console.error("[coupons] reverse failed:", err));
        break;
      default:
        break;
    }
  });
}
