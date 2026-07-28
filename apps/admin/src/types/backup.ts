import type { PaginationMeta } from "@/types";

/**
 * أنواع وحدة النسخ الاحتياطي (Phase 6) - مطابقة حرفياً لـ
 * apps/api/src/modules/backup/*. راجع الخادم قبل أي تعديل - لا حقول مُختلَقة.
 */

export type BackupStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
export type BackupProvider = "LOCAL" | "S3" | "R2" | "BACKBLAZE";
export type BackupTrigger = "MANUAL" | "SCHEDULED";
export type BackupScheduleFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
export type HealthLevel = "HEALTHY" | "WARNING" | "CRITICAL";

export interface BackupCounts {
  branches: number;
  users: number;
  customers: number;
  serviceCategories: number;
  services: number;
  orders: number;
  orderItems: number;
  orderStatusHistory: number;
  payments: number;
  auditLogs: number;
}

export interface BackupRecord {
  id: string;
  filename: string;
  provider: BackupProvider;
  trigger: BackupTrigger;
  status: BackupStatus;
  storagePath: string | null;
  sizeBytes: number | null;
  checksum: string | null;
  appVersion: string | null;
  compressed: boolean;
  encrypted: boolean;
  counts: BackupCounts | null;
  durationMs: number | null;
  error: string | null;
  retryCount: number;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdById: string | null;
}

export interface BackupHistoryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: BackupStatus;
  provider?: BackupProvider;
  from?: string;
  to?: string;
  sortBy?: "createdAt" | "sizeBytes" | "durationMs" | "status";
  sortOrder?: "asc" | "desc";
}

export interface BackupHistoryResult {
  backups: BackupRecord[];
  meta: PaginationMeta;
}

export interface BackupStatistics {
  total: number;
  successful: number;
  failed: number;
  storageUsedBytes: number;
  averageSizeBytes: number;
  averageDurationMs: number;
  lastBackupAt: string | null;
  nextBackupAt: string | null;
}

export interface BackupHealthCheck {
  key: string;
  label: string;
  level: HealthLevel;
  detail: string;
}

export interface BackupProviderStatus {
  provider: BackupProvider;
  configured: boolean;
  credentialsDetected: boolean;
}

export interface BackupHealth {
  level: HealthLevel;
  checks: BackupHealthCheck[];
  storage: { dir: string; writable: boolean };
  providers: BackupProviderStatus[];
  lastBackupAt: string | null;
  nextBackupAt: string | null;
}

export interface BackupSettings {
  id: string;
  provider: BackupProvider;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  retentionDays: number;
  keepLastN: number;
  scheduleEnabled: boolean;
  scheduleFrequency: BackupScheduleFrequency;
  scheduleTime: string;
  scheduleTimezone: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  scheduleRetryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBackupSettingsInput {
  provider?: BackupProvider;
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
  retentionDays?: number;
  keepLastN?: number;
  scheduleEnabled?: boolean;
  scheduleFrequency?: BackupScheduleFrequency;
  scheduleTime?: string;
  scheduleTimezone?: string;
}

export interface BackupMetadata {
  exportedAt: string;
  exportedBy: { id: string; email: string };
  applicationName: string;
  applicationVersion: string;
  environment: string;
}

export interface RestorePreview {
  valid: boolean;
  checksum: string;
  metadata: BackupMetadata | null;
  counts: BackupCounts | null;
  versionMatch: boolean;
  currentVersion: string;
  warnings: string[];
}

export interface RestoreResult {
  restored: BackupCounts;
  usersPreserved: number;
  durationMs: number;
}
