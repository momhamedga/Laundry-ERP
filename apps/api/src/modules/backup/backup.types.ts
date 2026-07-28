import type {
  AuditLog,
  BackupProvider,
  BackupRecord,
  BackupSettings,
  BackupStatus,
  Branch,
  Customer,
  Order,
  OrderItem,
  OrderStatusHistory,
  Payment,
  Service,
  ServiceCategory,
  SystemSettings,
} from "@prisma/client";
import type { SafeUser } from "../auth/index.js";

/** بيانات وصفية عن النسخة الاحتياطية نفسها */
export interface BackupMetadata {
  exportedAt: string;
  exportedBy: { id: string; email: string };
  applicationName: string;
  applicationVersion: string;
  environment: string;
}

/**
 * كل الجداول التشغيلية الحقيقية - بلا RefreshToken (أسرار جلسات صرفة)
 * وبلا حقول حساسة بالمستخدمين (SafeUser فقط - نفس تعقيم toSafeUser
 * المُستخدَم بكل استجابة API تحتوي مستخدمين)
 */
export interface BackupPayload {
  metadata: BackupMetadata;
  branches: Branch[];
  users: SafeUser[];
  customers: Customer[];
  serviceCategories: ServiceCategory[];
  services: Service[];
  orders: Order[];
  orderItems: OrderItem[];
  orderStatusHistory: OrderStatusHistory[];
  payments: Payment[];
  auditLogs: AuditLog[];
  settings: SystemSettings | null;
}

// ==================== Phase 6 DTOs ====================

export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** لقطة أعداد الجداول - تُخزَّن بـBackupRecord.counts وتُعرض بالمعاينة (متوافقة مع Prisma JSON) */
export interface BackupCounts extends Record<string, number> {
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

export type BackupRecordDto = BackupRecord;

export interface ListBackupHistoryResult {
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

export type HealthLevel = "HEALTHY" | "WARNING" | "CRITICAL";

export interface BackupHealthCheck {
  key: string;
  label: string;
  level: HealthLevel;
  detail: string;
}

export interface BackupHealth {
  level: HealthLevel;
  checks: BackupHealthCheck[];
  storage: {
    dir: string;
    writable: boolean;
  };
  providers: {
    provider: BackupProvider;
    configured: boolean;
    credentialsDetected: boolean;
  }[];
  lastBackupAt: string | null;
  nextBackupAt: string | null;
}

export type BackupSettingsResponse = BackupSettings;

/** معاينة استعادة - نتيجة فحص الملف المرفوع بلا أي كتابة على قاعدة البيانات */
export interface RestorePreview {
  valid: boolean;
  checksum: string;
  metadata: BackupMetadata | null;
  counts: BackupCounts | null;
  versionMatch: boolean;
  currentVersion: string;
  warnings: string[];
}

/** نتيجة تنفيذ الاستعادة الفعلية */
export interface RestoreResult {
  restored: BackupCounts;
  usersPreserved: number;
  durationMs: number;
}

export type { BackupProvider, BackupStatus, BackupRecord, BackupSettings };
