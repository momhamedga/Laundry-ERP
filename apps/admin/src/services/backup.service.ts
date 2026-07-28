import { apiClient } from "@/lib/axios";
import type { ApiListResponse, ApiResponse } from "@/types";
import type {
  BackupHealth,
  BackupHistoryParams,
  BackupHistoryResult,
  BackupRecord,
  BackupSettings,
  BackupStatistics,
  RestorePreview,
  RestoreResult,
  UpdateBackupSettingsInput,
} from "@/types/backup";

/**
 * خدمة النسخ الاحتياطي (Phase 6) - تستدعي /api/v1/backup/*. تعيد استخدام
 * أنماط التنزيل القائمة (Content-Disposition + createObjectURL + نقرة رابط).
 * رفع ملف الاستعادة يُرسَل كـoctet-stream (يتجاوز express.json العام بالخادم).
 */

function toQueryParams(params: BackupHistoryParams): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query[key] = String(value);
  }
  return query;
}

// ==================== Create / History ====================

export async function createBackup(): Promise<BackupRecord> {
  const { data } = await apiClient.post<ApiResponse<{ backup: BackupRecord }>>("/backup", {});
  return data.data.backup;
}

export async function getBackupHistory(params: BackupHistoryParams): Promise<BackupHistoryResult> {
  const { data } = await apiClient.get<ApiListResponse<{ backups: BackupRecord[] }>>(
    "/backup/history",
    { params: toQueryParams(params) },
  );
  return { backups: data.data.backups, meta: data.meta };
}

/** تنزيل ملف نسخة مُخزَّنة - نفس نمط downloadInvoice/downloadBackup حرفياً */
export async function downloadStoredBackup(id: string, filename: string): Promise<void> {
  const response = await apiClient.get<Blob>(`/backup/history/${id}/download`, {
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="([^"]+)"/);
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = match?.[1] ?? filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function deleteBackup(id: string): Promise<void> {
  await apiClient.delete<ApiResponse<{ id: string }>>(`/backup/history/${id}`);
}

export async function cleanupBackups(): Promise<{ deleted: number }> {
  const { data } = await apiClient.delete<ApiResponse<{ deleted: number }>>("/backup/history");
  return data.data;
}

export async function retryBackup(id: string): Promise<BackupRecord> {
  const { data } = await apiClient.post<ApiResponse<{ backup: BackupRecord }>>(
    `/backup/retry/${id}`,
    {},
  );
  return data.data.backup;
}

// ==================== Restore ====================

export async function restorePreview(file: File): Promise<RestorePreview> {
  const buffer = await file.arrayBuffer();
  const { data } = await apiClient.post<ApiResponse<{ preview: RestorePreview }>>(
    "/backup/restore/preview",
    buffer,
    { headers: { "Content-Type": "application/octet-stream" } },
  );
  return data.data.preview;
}

export async function restoreBackup(file: File, expectedChecksum?: string): Promise<RestoreResult> {
  const buffer = await file.arrayBuffer();
  const { data } = await apiClient.post<ApiResponse<{ result: RestoreResult }>>(
    "/backup/restore",
    buffer,
    {
      headers: {
        "Content-Type": "application/octet-stream",
        "x-restore-confirm": "true",
        ...(expectedChecksum ? { "x-expected-checksum": expectedChecksum } : {}),
      },
    },
  );
  return data.data.result;
}

// ==================== Statistics / Health / Settings ====================

export async function getBackupStatistics(): Promise<BackupStatistics> {
  const { data } = await apiClient.get<ApiResponse<{ statistics: BackupStatistics }>>(
    "/backup/statistics",
  );
  return data.data.statistics;
}

export async function getBackupHealth(): Promise<BackupHealth> {
  const { data } = await apiClient.get<ApiResponse<{ health: BackupHealth }>>("/backup/health");
  return data.data.health;
}

export async function getBackupSettings(): Promise<BackupSettings> {
  const { data } = await apiClient.get<ApiResponse<{ settings: BackupSettings }>>("/backup/settings");
  return data.data.settings;
}

export async function updateBackupSettings(
  input: UpdateBackupSettingsInput,
): Promise<BackupSettings> {
  const { data } = await apiClient.put<ApiResponse<{ settings: BackupSettings }>>(
    "/backup/settings",
    input,
  );
  return data.data.settings;
}
