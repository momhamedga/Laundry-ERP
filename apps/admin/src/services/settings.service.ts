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

