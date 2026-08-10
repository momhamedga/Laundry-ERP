"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/axios";
import * as settingsService from "@/services/settings.service";
import type { UpdateSettingsInput } from "@/types/settings";

// getBlobErrorMessage كانت هنا لقراءة أخطاء responseType:"blob" الخاصة بتنزيل
// النسخة من هذه الصفحة. حُذفت مع الزرّ نفسه؛ ولوحة النسخ الاحتياطي تستخدم
// النسخة المشتركة في lib/axios.

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

