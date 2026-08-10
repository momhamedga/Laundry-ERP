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
 * حمولة النسخة: كل جدول مشمول في BACKUP_TABLES مصفوفةٌ تحت مفتاحه، عدا
 * settings (مفرد) وusers (SafeUser بلا أي حقل حسّاس — نفس تعقيم toSafeUser
 * المُستخدَم في كل استجابة API تحتوي مستخدمين).
 *
 * الجداول العشرة القديمة مُصرَّح بأنواعها للحفاظ على أمان الأنواع في الشيفرة
 * القائمة؛ الجداول المُضافة تُمرَّر كسجلّات عامة لأن الوحدة تنقلها كما هي بلا
 * أي منطق يقرأ حقولها. مصدر الحقيقة لما يُشمَل هو BACKUP_TABLES لا هذا النوع.
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

/** سجلّ عام لأي صفّ داخل النسخة — المفتاح id مضمون في كل نماذج المخطّط */
export type BackupRow = Record<string, unknown> & { id: string };

/**
 * عرض الحمولة كخريطة مفاتيح — للوصول للجداول المُضافة بعد الجداول العشرة
 * المُصرَّح بأنواعها. فهرسٌ عام على BackupPayload نفسه كان سيُفقِد Omit
 * الحقولَ المسمّاة (keyof على نوع بفهرس عام يصير string).
 */
export type BackupPayloadMap = Record<string, unknown>;

// ==================== Phase 6 DTOs ====================

export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * لقطة أعداد الجداول - تُخزَّن بـBackupRecord.counts وتُعرض بالمعاينة.
 * مفتاحٌ لكل جدول في BACKUP_TABLES، فتنمو تلقائياً مع أي جدول يُضاف.
 */
export type BackupCounts = Record<string, number>;

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
