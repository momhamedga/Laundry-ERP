"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import * as settingsService from "@/services/settings.service";
import type { UpdateSettingsInput } from "@/types/settings";

/**
 * استجابة الخطأ عند responseType:"blob" تصل كـBlob وليست JSON مُحلَّلاً -
 * getErrorMessage العامة لا تقرأها بشكل صحيح، فنقرأ نص الـBlob ونحلله يدوياً
 * هنا فقط (حالة خاصة بهذا النداء تحديداً، غير موجودة بأي مكان آخر بالمشروع)
 */
async function getBlobErrorMessage(error: unknown): Promise<string> {
  if (error instanceof AxiosError && error.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text();
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      // تعذّر التحليل - يُستخدم المسار العام أدناه
    }
  }
  return getErrorMessage(error);
}

export const settingsKeys = {
  all: ["settings"] as const,
  detail: () => [...settingsKeys.all, "detail"] as const,
};

export function useSettingsQuery() {
  return useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: () => settingsService.getSettings(),
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSettingsInput) => settingsService.updateSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.detail() });
      toast.success("تم حفظ الإعدادات بنجاح");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

/** GET /backup - تنزيل مباشر بلا حفظ أي نسخة على الخادم أو بالمتصفح */
export function useDownloadBackupMutation() {
  return useMutation({
    mutationFn: () => settingsService.downloadBackup(),
    onSuccess: () => toast.success("تم تنزيل النسخة الاحتياطية بنجاح"),
    onError: (error: unknown) => {
      void getBlobErrorMessage(error).then((message) => toast.error(message));
    },
  });
}
