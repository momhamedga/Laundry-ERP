import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  BulkNotificationInput,
  ChannelSettings,
  ListNotificationsParams,
  ListNotificationsResult,
  NotificationItem,
  NotificationPreferenceMap,
  NotificationStatistics,
  ProviderStatusMap,
  QueueStatus,
} from "@/types/notification";

function toQueryParams(params: ListNotificationsParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.limit) query.limit = String(params.limit);
  if (params.search) query.search = params.search;
  if (params.type) query.type = params.type;
  if (params.status) query.status = params.status;
  if (params.dateFrom) query.dateFrom = params.dateFrom;
  if (params.dateTo) query.dateTo = params.dateTo;
  if (params.priority) query.priority = params.priority;
  if (params.channel) query.channel = params.channel;
  return query;
}

export async function listNotifications(
  params: ListNotificationsParams,
): Promise<ListNotificationsResult> {
  const { data } = await apiClient.get<ApiListResponse<{ notifications: NotificationItem[] }>>(
    "/notifications",
    { params: toQueryParams(params) },
  );
  return { notifications: data.data.notifications, meta: data.meta };
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<ApiResponse<{ count: number }>>(
    "/notifications/unread-count",
  );
  return data.data.count;
}

export async function markRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markUnread(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/unread`);
}

export async function markAllRead(): Promise<void> {
  await apiClient.patch("/notifications/read-all");
}

export async function archiveNotification(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/archive`);
}

export async function unarchiveNotification(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/unarchive`);
}

export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`/notifications/${id}`);
}

export async function bulkAction(input: BulkNotificationInput): Promise<{ affected: number }> {
  const { data } = await apiClient.post<ApiResponse<{ affected: number }>>(
    "/notifications/bulk",
    input,
  );
  return data.data;
}

export async function getPreferences(): Promise<NotificationPreferenceMap> {
  const { data } = await apiClient.get<ApiResponse<{ preferences: NotificationPreferenceMap }>>(
    "/notifications/preferences",
  );
  return data.data.preferences;
}

export async function updatePreferences(
  input: Partial<NotificationPreferenceMap>,
): Promise<NotificationPreferenceMap> {
  const { data } = await apiClient.put<ApiResponse<{ preferences: NotificationPreferenceMap }>>(
    "/notifications/preferences",
    input,
  );
  return data.data.preferences;
}

// ==================== Phase 4D: القنوات العامة + Quiet Hours + Digest ====================

export async function getChannelSettings(): Promise<ChannelSettings> {
  const { data } = await apiClient.get<ApiResponse<{ settings: ChannelSettings }>>(
    "/notifications/channel-settings",
  );
  return data.data.settings;
}

export async function updateChannelSettings(
  input: Partial<ChannelSettings>,
): Promise<ChannelSettings> {
  const { data } = await apiClient.put<ApiResponse<{ settings: ChannelSettings }>>(
    "/notifications/channel-settings",
    input,
  );
  return data.data.settings;
}

export async function sendTestNotification(): Promise<void> {
  await apiClient.post("/notifications/test");
}

export async function getProviderStatus(): Promise<ProviderStatusMap> {
  const { data } = await apiClient.get<ApiResponse<{ providers: ProviderStatusMap }>>(
    "/notifications/providers/status",
  );
  return data.data.providers;
}

export async function getQueueStatus(): Promise<QueueStatus> {
  const { data } = await apiClient.get<ApiResponse<{ queue: QueueStatus }>>(
    "/notifications/queue/status",
  );
  return data.data.queue;
}

export async function retryFailedDeliveries(): Promise<{ affected: number }> {
  const { data } = await apiClient.post<ApiResponse<{ affected: number }>>(
    "/notifications/queue/retry-failed",
  );
  return data.data;
}

export async function clearOldNotifications(
  olderThanDays: number,
): Promise<{ deleted: number }> {
  const { data } = await apiClient.delete<ApiResponse<{ deleted: number }>>(
    "/notifications/cleanup",
    { params: { olderThanDays } },
  );
  return data.data;
}

export async function getStatistics(): Promise<NotificationStatistics> {
  const { data } = await apiClient.get<ApiResponse<{ statistics: NotificationStatistics }>>(
    "/notifications/statistics",
  );
  return data.data.statistics;
}
