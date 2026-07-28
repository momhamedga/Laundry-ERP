import { z } from "zod";
import type { BackupSettings, UpdateBackupSettingsInput } from "@/types/backup";

/**
 * تحقّق نموذج إعدادات النسخ (Phase 6) - مطابق لحدود
 * apps/api/src/modules/backup/backup.validator.ts.
 */
export const backupSettingsFormSchema = z.object({
  provider: z.enum(["LOCAL", "S3", "R2", "BACKBLAZE"]),
  compressionEnabled: z.boolean(),
  encryptionEnabled: z.boolean(),
  retentionDays: z.number().int().min(1).max(3650),
  keepLastN: z.number().int().min(1).max(1000),
  scheduleEnabled: z.boolean(),
  scheduleFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  scheduleTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "الوقت يجب أن يكون HH:mm"),
  scheduleTimezone: z.string().trim().min(1).max(100),
});

export type BackupSettingsFormValues = z.infer<typeof backupSettingsFormSchema>;

export function mapSettingsToForm(s: BackupSettings): BackupSettingsFormValues {
  return {
    provider: s.provider,
    compressionEnabled: s.compressionEnabled,
    encryptionEnabled: s.encryptionEnabled,
    retentionDays: s.retentionDays,
    keepLastN: s.keepLastN,
    scheduleEnabled: s.scheduleEnabled,
    scheduleFrequency: s.scheduleFrequency,
    scheduleTime: s.scheduleTime,
    scheduleTimezone: s.scheduleTimezone,
  };
}

export function toUpdateInput(values: BackupSettingsFormValues): UpdateBackupSettingsInput {
  return values;
}
