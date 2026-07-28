import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";
import type { SettingsResponse, UpdateSettingsInput } from "@/types/settings";

/** GET /settings - أي مستخدم مسجل */
export async function getSettings(): Promise<SettingsResponse> {
  const { data } = await apiClient.get<ApiResponse<{ settings: SettingsResponse }>>("/settings");
  return data.data.settings;
}

/** PUT /settings - settings:manage فقط بالخادم */
export async function updateSettings(input: UpdateSettingsInput): Promise<SettingsResponse> {
  const { data } = await apiClient.put<ApiResponse<{ settings: SettingsResponse }>>(
    "/settings",
    input,
  );
  return data.data.settings;
}

/**
 * GET /backup - settings:manage فقط بالخادم - تنزيل ملف JSON حقيقي (ليس
 * استجابة API عادية، بلا غلاف ApiResponse) يحتوي كل بيانات النظام التشغيلية
 * (بلا كلمات سر/أسرار جلسات - مُعقَّمة بالخادم عبر toSafeUser). يُنزَّل
 * مباشرة لجهاز المستخدم فوراً - بلا حفظ أي نسخة على الخادم أو بالمتصفح.
 */
export async function downloadBackup(): Promise<void> {
  const response = await apiClient.get<Blob>("/backup", { responseType: "blob" });

  const disposition = response.headers["content-disposition"] as string | undefined;
  const filenameMatch = disposition?.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] ?? `laundry-erp-backup-${Date.now()}.json`;

  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
