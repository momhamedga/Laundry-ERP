import { EventEmitter } from "node:events";
import type { NotificationEvent } from "./notification.types.js";

/**
 * ناقل أحداث داخلي مفرد (Singleton) - نقطة الوصل الوحيدة بين وحدات العمل
 * (orders/payments/invoices/backup/auth) ووحدة الإشعارات، بلا حقن DI متبادل.
 *
 * القاعدة الصارمة: كل استدعاء emit() من أي وحدة منتِجة يجب أن يكون
 * fire-and-forget داخل try/catch لدى المُنتِج - فشل الإشعار لا يجب أبداً
 * أن يُفشِل إنشاء الطلب/الدفعة/الفاتورة. هذا الملف نفسه لا يرمي عند عدم
 * وجود مستمع (EventEmitter افتراضياً آمن هنا لأننا لا نستخدم حدث "error").
 */
class NotificationBus extends EventEmitter {
  emitNotification(event: NotificationEvent): void {
    this.emit("notification", event);
  }

  onNotification(listener: (event: NotificationEvent) => void): void {
    this.on("notification", listener);
  }
}

export const notificationBus = new NotificationBus();
