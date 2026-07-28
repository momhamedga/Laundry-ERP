"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import { startNotificationsStream } from "@/lib/notifications-stream";
import { notificationKeys } from "@/lib/query-keys";
import * as notificationsService from "@/services/notifications.service";
import type {
  BulkNotificationInput,
  ChannelSettings,
  ListNotificationsParams,
  NotificationPreferenceMap,
} from "@/types/notification";

export function useNotificationsQuery(params: ListNotificationsParams) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsService.listNotifications(params),
    placeholderData: keepPreviousData,
  });
}

export function useUnreadCountQuery() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsService.getUnreadCount(),
    // احتياطي فقط عند غياب/تعثّر SSE - التحديث اللحظي الحقيقي عبر notifications-stream.ts
    refetchInterval: 60_000,
  });
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useMarkReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useMarkUnreadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.markUnread(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useMarkAllReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => invalidateAll(queryClient),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useArchiveNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.archiveNotification(id),
    onSuccess: () => invalidateAll(queryClient),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useUnarchiveNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.unarchiveNotification(id),
    onSuccess: () => invalidateAll(queryClient),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.deleteNotification(id),
    onSuccess: () => invalidateAll(queryClient),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useBulkNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkNotificationInput) => notificationsService.bulkAction(input),
    onSuccess: () => invalidateAll(queryClient),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useNotificationPreferencesQuery() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => notificationsService.getPreferences(),
  });
}

export function useUpdateNotificationPreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<NotificationPreferenceMap>) =>
      notificationsService.updatePreferences(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
      toast.success("تم حفظ تفضيلات الإشعارات");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

/**
 * يبدأ اتصال SSE المستمر (Infinite Refresh) طوال بقاء المكوّن المُستدعي مُركَّباً -
 * يُستدعى مرة واحدة فقط من NotificationsMenu (مُركَّب دائماً بالهيدر طوال الجلسة)
 */
export function useNotificationsRealtime(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const stop = startNotificationsStream(() => invalidateAll(queryClient));
    return stop;
  }, [queryClient]);
}

// ==================== Phase 4D: القنوات العامة + Quiet Hours + Digest ====================

export function useChannelSettingsQuery() {
  return useQuery({
    queryKey: notificationKeys.channelSettings(),
    queryFn: () => notificationsService.getChannelSettings(),
  });
}

export function useUpdateChannelSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ChannelSettings>) =>
      notificationsService.updateChannelSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.channelSettings() });
      toast.success("تم حفظ إعدادات القنوات");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useSendTestNotificationMutation() {
  return useMutation({
    mutationFn: () => notificationsService.sendTestNotification(),
    onSuccess: () => toast.success("تم إرسال الإشعار الاختباري"),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

/** enabled: notifications:manage فقط (ADMIN) - يمنع طلباً محكوماً بالفشل 403 لغير المخوَّلين */
export function useProviderStatusQuery(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.providerStatus(),
    queryFn: () => notificationsService.getProviderStatus(),
    enabled,
  });
}

export function useQueueStatusQuery(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.queueStatus(),
    queryFn: () => notificationsService.getQueueStatus(),
    refetchInterval: 15_000, // متابعة تقدّم المعالجة أثناء بقاء اللوحة مفتوحة
    enabled,
  });
}

export function useRetryFailedDeliveriesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsService.retryFailedDeliveries(),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.queueStatus() });
      toast.success(`أُعيدت جدولة ${result.affected} محاولة فاشلة`);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useClearOldNotificationsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (olderThanDays: number) =>
      notificationsService.clearOldNotifications(olderThanDays),
    onSuccess: (result) => {
      invalidateAll(queryClient);
      toast.success(`حُذف ${result.deleted} إشعاراً قديماً`);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useNotificationStatisticsQuery() {
  return useQuery({
    queryKey: notificationKeys.statistics(),
    queryFn: () => notificationsService.getStatistics(),
  });
}
