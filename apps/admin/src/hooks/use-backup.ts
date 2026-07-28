"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getBlobErrorMessage, getErrorMessage } from "@/lib/axios";
import { backupKeys } from "@/lib/query-keys";
import * as backupService from "@/services/backup.service";
import type { BackupHistoryParams, UpdateBackupSettingsInput } from "@/types/backup";

/**
 * Hooks النسخ الاحتياطي (Phase 6) - نفس أنماط الوحدات السابقة:
 * استعلامات مع keepPreviousData للترقيم، طفرات مع toast + إبطال المفاتيح.
 * أخطاء التنزيل (Blob) تُقرأ عبر getBlobErrorMessage المشترك.
 */

// ==================== Queries ====================

export function useBackupHistoryQuery(params: BackupHistoryParams) {
  return useQuery({
    queryKey: backupKeys.history(params),
    queryFn: () => backupService.getBackupHistory(params),
    placeholderData: keepPreviousData,
  });
}

export function useBackupStatisticsQuery() {
  return useQuery({
    queryKey: backupKeys.statistics(),
    queryFn: () => backupService.getBackupStatistics(),
  });
}

export function useBackupHealthQuery() {
  return useQuery({
    queryKey: backupKeys.health(),
    queryFn: () => backupService.getBackupHealth(),
  });
}

export function useBackupSettingsQuery() {
  return useQuery({
    queryKey: backupKeys.settings(),
    queryFn: () => backupService.getBackupSettings(),
  });
}

// ==================== Mutations ====================

/** يبطل كل استعلامات النسخ (History/Statistics/Health) بعد أي تغيير */
function useInvalidateBackup() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: backupKeys.all });
}

export function useCreateBackupMutation() {
  const invalidate = useInvalidateBackup();
  return useMutation({
    mutationFn: () => backupService.createBackup(),
    onSuccess: () => {
      toast.success("تم إنشاء نسخة احتياطية");
      invalidate();
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useDownloadStoredBackupMutation() {
  return useMutation({
    mutationFn: ({ id, filename }: { id: string; filename: string }) =>
      backupService.downloadStoredBackup(id, filename),
    onError: (error: unknown) => {
      void getBlobErrorMessage(error).then((message) => toast.error(message));
    },
  });
}

export function useDeleteBackupMutation() {
  const invalidate = useInvalidateBackup();
  return useMutation({
    mutationFn: (id: string) => backupService.deleteBackup(id),
    onSuccess: () => {
      toast.success("تم حذف النسخة");
      invalidate();
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useCleanupBackupsMutation() {
  const invalidate = useInvalidateBackup();
  return useMutation({
    mutationFn: () => backupService.cleanupBackups(),
    onSuccess: (result) => {
      toast.success(`تم تنظيف ${result.deleted} نسخة`);
      invalidate();
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useRetryBackupMutation() {
  const invalidate = useInvalidateBackup();
  return useMutation({
    mutationFn: (id: string) => backupService.retryBackup(id),
    onSuccess: () => {
      toast.success("تمت إعادة المحاولة");
      invalidate();
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useRestorePreviewMutation() {
  return useMutation({
    mutationFn: (file: File) => backupService.restorePreview(file),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useRestoreBackupMutation() {
  const invalidate = useInvalidateBackup();
  return useMutation({
    mutationFn: ({ file, expectedChecksum }: { file: File; expectedChecksum?: string }) =>
      backupService.restoreBackup(file, expectedChecksum),
    onSuccess: () => {
      toast.success("تمت الاستعادة بنجاح");
      invalidate();
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateBackupSettingsMutation() {
  const invalidate = useInvalidateBackup();
  return useMutation({
    mutationFn: (input: UpdateBackupSettingsInput) => backupService.updateBackupSettings(input),
    onSuccess: () => {
      toast.success("تم تحديث إعدادات النسخ");
      invalidate();
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}
