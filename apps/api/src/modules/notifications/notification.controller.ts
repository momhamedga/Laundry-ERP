import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type {
  BulkActionDto,
  UpdateChannelSettingsDto,
  UpdatePreferencesDto,
} from "./notification.dto.js";
import { notificationSseHub } from "./notification.sse.js";
import type { NotificationService } from "./notification.service.js";
import {
  bulkActionSchema,
  cleanupQuerySchema,
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  updateChannelSettingsSchema,
  updatePreferencesSchema,
} from "./notification.validator.js";

/** يضمن وجود req.user - تُستدعى فقط بعد authenticate */
function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "يلزم تسجيل الدخول للمتابعة.");
  return req.user;
}

function parseNotificationId(req: Request): string {
  return notificationIdParamSchema.parse(req.params).id;
}

export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  /** GET /notifications - قائمة إشعارات المستخدم الحالي مع ترقيم/بحث/فلاتر */
  list: RequestHandler = asyncHandler(async (req, res) => {
    const query = listNotificationsQuerySchema.parse(req.query);
    const user = requireUser(req);
    const result = await this.service.list(user.id, query);
    sendPaginated(res, { notifications: result.notifications }, result.meta);
  });

  /** GET /notifications/unread-count */
  unreadCount: RequestHandler = asyncHandler(async (req, res) => {
    const count = await this.service.unreadCount(requireUser(req).id);
    sendSuccess(res, { count });
  });

  /** GET /notifications/:id */
  getById: RequestHandler = asyncHandler(async (req, res) => {
    const notification = await this.service.getById(requireUser(req).id, parseNotificationId(req));
    sendSuccess(res, { notification });
  });

  /** PATCH /notifications/:id/read */
  markRead: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.markRead(requireUser(req).id, parseNotificationId(req));
    sendSuccess(res, {}, "Notification marked as read");
  });

  /** PATCH /notifications/:id/unread */
  markUnread: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.markUnread(requireUser(req).id, parseNotificationId(req));
    sendSuccess(res, {}, "Notification marked as unread");
  });

  /** PATCH /notifications/read-all */
  markAllRead: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.markAllRead(requireUser(req).id);
    sendSuccess(res, {}, "All notifications marked as read");
  });

  /** PATCH /notifications/:id/archive */
  archive: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.archive(requireUser(req).id, parseNotificationId(req));
    sendSuccess(res, {}, "Notification archived");
  });

  /** PATCH /notifications/:id/unarchive */
  unarchive: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.unarchive(requireUser(req).id, parseNotificationId(req));
    sendSuccess(res, {}, "Notification unarchived");
  });

  /** DELETE /notifications/:id */
  delete: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.delete(requireUser(req).id, parseNotificationId(req));
    sendSuccess(res, {}, "Notification deleted");
  });

  /** POST /notifications/bulk */
  bulkAction: RequestHandler = asyncHandler(async (req, res) => {
    const dto = bulkActionSchema.parse(req.body) as BulkActionDto;
    const result = await this.service.bulkAction(requireUser(req).id, dto);
    sendSuccess(res, result, "Bulk action applied");
  });

  /** GET /notifications/preferences */
  getPreferences: RequestHandler = asyncHandler(async (req, res) => {
    const preferences = await this.service.getPreferences(requireUser(req).id);
    sendSuccess(res, { preferences });
  });

  /** PUT /notifications/preferences */
  updatePreferences: RequestHandler = asyncHandler(async (req, res) => {
    const dto = updatePreferencesSchema.parse(req.body) as UpdatePreferencesDto;
    const preferences = await this.service.updatePreferences(
      requireUser(req).id,
      dto,
      getRequestContext(req),
    );
    sendSuccess(res, { preferences }, "Preferences updated");
  });

  /**
   * GET /notifications/stream - SSE. العميل يتصل عبر fetch+ReadableStream
   * (وليس EventSource) لأنه يحمل Authorization: Bearer - راجع notification.sse.ts
   */
  stream: RequestHandler = (req, res) => {
    const user = requireUser(req);

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // يمنع أي reverse proxy من تخزين الرد مؤقتاً
    res.flushHeaders();
    res.write(`: connected\n\n`);

    const unsubscribe = notificationSseHub.subscribe(user.id, res);

    req.on("close", () => {
      unsubscribe();
      res.end();
    });
  };

  // ==================== Phase 4D: القنوات العامة + Quiet Hours + Digest ====================

  /** GET /notifications/channel-settings */
  getChannelSettings: RequestHandler = asyncHandler(async (req, res) => {
    const settings = await this.service.getChannelSettings(requireUser(req).id);
    sendSuccess(res, { settings });
  });

  /** PUT /notifications/channel-settings */
  updateChannelSettings: RequestHandler = asyncHandler(async (req, res) => {
    const dto = updateChannelSettingsSchema.parse(req.body) as UpdateChannelSettingsDto;
    const settings = await this.service.updateChannelSettings(
      requireUser(req).id,
      dto,
      getRequestContext(req),
    );
    sendSuccess(res, { settings }, "Channel settings updated");
  });

  /** POST /notifications/test */
  sendTest: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.sendTestNotification(requireUser(req).id);
    sendSuccess(res, {}, "Test notification sent");
  });

  /** GET /notifications/providers/status */
  getProviderStatus: RequestHandler = asyncHandler(async (req, res) => {
    const providers = this.service.getProviderStatus();
    sendSuccess(res, { providers });
  });

  /** GET /notifications/queue/status */
  getQueueStatus: RequestHandler = asyncHandler(async (req, res) => {
    const queue = await this.service.getQueueStatus();
    sendSuccess(res, { queue });
  });

  /** POST /notifications/queue/retry-failed */
  retryFailed: RequestHandler = asyncHandler(async (req, res) => {
    const result = await this.service.retryFailedDeliveries();
    sendSuccess(res, result, "Failed deliveries re-queued");
  });

  /** DELETE /notifications/cleanup?olderThanDays=N */
  cleanup: RequestHandler = asyncHandler(async (req, res) => {
    const { olderThanDays } = cleanupQuerySchema.parse(req.query);
    const result = await this.service.clearOldNotifications(olderThanDays);
    sendSuccess(res, result, "Old notifications deleted");
  });

  /** GET /notifications/statistics */
  getStatistics: RequestHandler = asyncHandler(async (req, res) => {
    const statistics = await this.service.getStatistics(requireUser(req).id);
    sendSuccess(res, { statistics });
  });
}
