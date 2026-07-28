import type { Response } from "express";
import { SSE_HEARTBEAT_MS } from "./notification.constants.js";
import type { NotificationRow } from "./notification.types.js";

/**
 * Hub بث Server-Sent Events - بديل خفيف لـ WebSocket/Redis Pub-Sub، كافٍ
 * لعملية API واحدة (القرار المعماري المعتمد لهذه المرحلة).
 *
 * لماذا SSE عبر Response خام وليس EventSource بالمتصفح؟ الواجهة تستخدم
 * Authorization: Bearer (توكين بالذاكرة) - EventSource الأصلي لا يرسل Headers
 * مخصصة، فالعميل يتصل عبر fetch + ReadableStream بدلاً منه (راجع
 * apps/admin/src/lib/notifications-stream.ts بمرحلة 4C).
 */
class NotificationSseHub {
  private readonly subscribers = new Map<string, Set<Response>>();

  subscribe(userId: string, res: Response): () => void {
    let set = this.subscribers.get(userId);
    if (!set) {
      set = new Set();
      this.subscribers.set(userId, set);
    }
    set.add(res);

    const heartbeat = setInterval(() => {
      res.write(`: heartbeat\n\n`);
    }, SSE_HEARTBEAT_MS);

    // تنظيف عند إغلاق الاتصال (تصفّح، إعادة اتصال، إلخ) - لا تسريب Response
    return () => {
      clearInterval(heartbeat);
      const current = this.subscribers.get(userId);
      current?.delete(res);
      if (current && current.size === 0) {
        this.subscribers.delete(userId);
      }
    };
  }

  /** بث فوري لكل اتصالات مستخدم واحد (قد يملك أكثر من تبويب/جهاز مفتوح) */
  publish(userId: string, notification: NotificationRow): void {
    const set = this.subscribers.get(userId);
    if (!set || set.size === 0) return;

    const payload = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
    for (const res of set) {
      res.write(payload);
    }
  }
}

/** Singleton واحد للعملية بالكامل - يُحقن ضمنياً عبر الاستيراد (نمط notification.bus.ts) */
export const notificationSseHub = new NotificationSseHub();
