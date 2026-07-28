import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { buildEmailService } from "../email/index.js";
import { NotificationController } from "./notification.controller.js";
import { notificationBus } from "./notification.bus.js";
import { NotificationRepository } from "./notification.repository.js";
import { createNotificationRouter } from "./notification.routes.js";
import { startNotificationScheduler as startScheduler } from "./notification.scheduler.js";
import { NotificationService } from "./notification.service.js";
import { ChannelRegistry } from "./providers/channel-registry.js";
import { EmailChannelProvider } from "./providers/email.channel.js";
import { PushProvider } from "./providers/push.provider.js";
import { SmsProvider } from "./providers/sms.provider.js";
import { WhatsAppProvider } from "./providers/whatsapp.provider.js";

/**
 * Composition Root لوحدة الإشعارات.
 * Repository/Service/Registry تُبنى مرة واحدة عند تحميل الوحدة (Singleton فعلي -
 * نفس نمط lib/prisma.ts) لأن notification.bus والـ scheduler يحتاجان نفس
 * نسخة الخدمة بالضبط بصرف النظر عن متى استُدعي buildNotificationsModule().
 */
const channelRegistry = new ChannelRegistry();
channelRegistry.register("EMAIL", new EmailChannelProvider(buildEmailService()));
channelRegistry.register("SMS", new SmsProvider());
channelRegistry.register("WHATSAPP", new WhatsAppProvider());
channelRegistry.register("PUSH", new PushProvider());

const notificationRepository = new NotificationRepository(prisma);
const notificationService = new NotificationService(notificationRepository, channelRegistry);

// وصلة المُنتِجين (orders/payments/invoices/backup/auth) → الخدمة، عبر bus مفرد.
// أي emit من أي وحدة عمل يصل هنا بلا حقن DI متبادل. fire-safe: dispatch() لا ترمي.
notificationBus.onNotification((event) => {
  void notificationService.dispatch(event);
});

export function buildNotificationsModule(): Router {
  const controller = new NotificationController(notificationService);
  return createNotificationRouter(controller);
}

/** يُستدعى من server.ts بعد بدء الاستماع - يُعيد دالة إيقاف لاستخدامها بالإغلاق النظيف */
export function startNotificationScheduler(): () => void {
  return startScheduler(notificationService);
}

// الواجهة العامة للـ Module
export { notificationBus } from "./notification.bus.js";
export { NotificationService } from "./notification.service.js";
export type { NotificationEvent } from "./notification.types.js";
