import { BackupProvider, BackupScheduleFrequency, BackupStatus } from "@prisma/client";
import { z } from "zod";
import {
  BACKUP_HISTORY_SORTABLE_FIELDS,
  DEFAULT_HISTORY_LIMIT,
  DEFAULT_HISTORY_PAGE,
  MAX_HISTORY_LIMIT,
  MAX_KEEP_LAST_N,
  MAX_RETENTION_DAYS,
  SORT_ORDERS,
} from "./backup.constants.js";

/**
 * تحقّق وحدة النسخ الاحتياطي (Phase 6) - نفس أسلوب reports/notifications:
 * enums حقيقية من Prisma، حدود من backup.constants، لا قيم مُختلَقة.
 */

// ==================== GET /backup/history ====================
export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_HISTORY_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_HISTORY_LIMIT).default(DEFAULT_HISTORY_LIMIT),
  search: z.string().trim().max(200).optional(),
  status: z.enum(BackupStatus).optional(),
  provider: z.enum(BackupProvider).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortBy: z.enum(BACKUP_HISTORY_SORTABLE_FIELDS).default("createdAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
});

export type HistoryQuery = z.infer<typeof historyQuerySchema>;

// ==================== POST /backup (create persisted) ====================
export const createBackupSchema = z
  .object({
    /** إجبار مزوّد لهذه النسخة فقط - غيابه يستخدم مزوّد الإعدادات */
    provider: z.enum(BackupProvider).optional(),
  })
  .default({});

export type CreateBackupInput = z.infer<typeof createBackupSchema>;

// ==================== PUT /backup/settings ====================
export const updateBackupSettingsSchema = z
  .object({
    provider: z.enum(BackupProvider),
    compressionEnabled: z.boolean(),
    encryptionEnabled: z.boolean(),
    retentionDays: z.number().int().min(1).max(MAX_RETENTION_DAYS),
    keepLastN: z.number().int().min(1).max(MAX_KEEP_LAST_N),
    scheduleEnabled: z.boolean(),
    scheduleFrequency: z.enum(BackupScheduleFrequency),
    scheduleTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm (24h)"),
    scheduleTimezone: z.string().trim().min(1).max(100),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "لا توجد حقول للتعديل." });

export type UpdateBackupSettingsInput = z.infer<typeof updateBackupSettingsSchema>;

// ==================== POST /backup/restore (confirm) ====================
export const restoreConfirmSchema = z.object({
  /** تأكيد صريح إلزامي - الاستعادة تعيد كتابة قاعدة البيانات */
  confirm: z.literal(true),
  /** المجموع الاختباري المُتوقَّع (من خطوة المعاينة) - حماية إضافية اختيارية */
  expectedChecksum: z.string().trim().optional(),
});

export type RestoreConfirmInput = z.infer<typeof restoreConfirmSchema>;
