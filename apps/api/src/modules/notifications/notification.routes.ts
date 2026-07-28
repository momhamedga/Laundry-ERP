import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import type { NotificationController } from "./notification.controller.js";

/**
 * مسارات الإشعارات - /api/v1/notifications
 * notifications:read لكل الأدوار (راجع auth.constants.ts) - كل مستخدم يدير
 * إشعاراته الخاصة فقط، العزل الحقيقي بـ userId على مستوى الـ Repository.
 *
 * Phase 4D - RBAC ثلاث طبقات (جميعها إضافية، لا تغيّر صلاحية أي Route قائم):
 * - notifications:read   → القراءة (كما هي - المسارات القديمة لم تُمَس)
 * - notifications:update → إجراء ذاتي جديد (channel-settings/test) - كل الأدوار تملكها أيضاً
 * - notifications:manage → عمليات تشغيلية عامة على مستوى النظام (Provider/Queue/Retry/Cleanup) - ADMIN فقط
 *
 * ترتيب المسارات الثابتة (unread-count/read-all/preferences/bulk/stream/
 * channel-settings/test/providers/queue/cleanup/statistics) قبل المسارات
 * الديناميكية (:id) إلزامي - Express يطابق أول تعريف مطابق
 */
export function createNotificationRouter(controller: NotificationController): Router {
  const router = Router();

  router.use(authenticate, requirePermission("notifications:read"));

  // Real-time (قبل :id)
  router.get("/stream", controller.stream);

  // Collection
  router.get("/", controller.list);
  router.get("/unread-count", controller.unreadCount);
  router.patch("/read-all", controller.markAllRead);
  router.post("/bulk", controller.bulkAction);

  // Preferences (قبل :id)
  router.get("/preferences", controller.getPreferences);
  router.put("/preferences", controller.updatePreferences);

  // Phase 4D - القنوات العامة + Quiet Hours + Digest (ذاتية - notifications:update)
  router.get("/channel-settings", controller.getChannelSettings);
  router.put(
    "/channel-settings",
    requirePermission("notifications:update"),
    controller.updateChannelSettings,
  );
  router.post("/test", requirePermission("notifications:update"), controller.sendTest);

  // Phase 4D - إحصائيات ذاتية (notifications:read يكفي - نفس طبقة القراءة)
  router.get("/statistics", controller.getStatistics);

  // Phase 4D - عمليات تشغيلية عامة على مستوى النظام (ADMIN فقط)
  router.get(
    "/providers/status",
    requirePermission("notifications:manage"),
    controller.getProviderStatus,
  );
  router.get("/queue/status", requirePermission("notifications:manage"), controller.getQueueStatus);
  router.post(
    "/queue/retry-failed",
    requirePermission("notifications:manage"),
    controller.retryFailed,
  );
  router.delete("/cleanup", requirePermission("notifications:manage"), controller.cleanup);

  // Item
  router.get("/:id", controller.getById);
  router.patch("/:id/read", controller.markRead);
  router.patch("/:id/unread", controller.markUnread);
  router.patch("/:id/archive", controller.archive);
  router.patch("/:id/unarchive", controller.unarchive);
  router.delete("/:id", controller.delete);

  return router;
}
