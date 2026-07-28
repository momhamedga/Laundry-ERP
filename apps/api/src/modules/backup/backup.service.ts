import { createReadStream, createWriteStream, type ReadStream } from "node:fs";
import { access, constants, mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import type {
  BackupProvider,
  BackupRecord,
  BackupSettings,
  BackupTrigger,
} from "@prisma/client";
import { APPLICATION_NAME } from "../settings/settings.constants.js";
import type { AuthenticatedUser } from "../auth/index.js";
import type { RequestContext } from "../auth/auth.types.js";
import { notificationBus } from "../notifications/index.js";
import { env } from "../../config/env.js";
import { resolveBackupDir } from "./backup.constants.js";
import type { BackupRepository } from "./backup.repository.js";
import { reviveDates } from "./backup.repository.js";
import { BackupStorageRegistry } from "./backup.storage.js";
import type {
  BackupCounts,
  BackupHealth,
  BackupHealthCheck,
  BackupPayload,
  BackupSettingsResponse,
  BackupStatistics,
  HealthLevel,
  ListBackupHistoryResult,
  RestorePreview,
  RestoreResult,
} from "./backup.types.js";
import type { HistoryQuery, UpdateBackupSettingsInput } from "./backup.validator.js";
import {
  buildBackupFilename,
  buildStoredBackupFilename,
  computeBufferChecksum,
  computeFileChecksum,
  computeNextRun,
  readApplicationVersion,
} from "./backup.utils.js";

const APPLICATION_VERSION = readApplicationVersion();

export class BackupService {
  private readonly storage = new BackupStorageRegistry();

  constructor(private readonly repo: BackupRepository) {}

  // ==================== الإنشاء الأصلي (تنزيل مباشر - GET /backup، بلا تغيير) ====================

  /**
   * try/catch يُطلق BACKUP_FAILED عند أي خطأ - السلوك الخارجي لا يتغيّر إطلاقاً.
   * هذا المسار (تنزيل مباشر) باقٍ كما هو تماماً؛ الإنشاء المُخزَّن أدناه منفصل.
   */
  async generate(actor: AuthenticatedUser, ctx: RequestContext): Promise<BackupPayload> {
    try {
      const data = await this.repo.collectAll();
      await this.repo.createAuditLog({
        action: "SYSTEM_BACKUP_CREATED",
        userId: actor.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: { counts: this.countsOf(data) },
      });
      const payload = this.wrapPayload(data, actor);
      notificationBus.emitNotification({
        type: "BACKUP_COMPLETED",
        data: { triggeredByEmail: actor.email },
      });
      return payload;
    } catch (err) {
      notificationBus.emitNotification({
        type: "BACKUP_FAILED",
        data: {
          triggeredByEmail: actor.email,
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        },
      });
      throw err;
    }
  }

  // ==================== Phase 6: إنشاء نسخة مُخزَّنة على القرص ====================

  /**
   * ينشئ نسخة ويحفظها على القرص + يسجّلها بـBackupRecord. يُعيد استخدام
   * collectAll الحالي (نفس منطق الجمع، بلا تكرار). الكتابة متدفّقة عبر
   * pipeline (بلا مضاعفة الذاكرة). المزوّد السحابي غير المُهيّأ يتراجع لـLOCAL.
   */
  async createStoredBackup(
    trigger: BackupTrigger,
    actor: AuthenticatedUser | null,
    ctx: RequestContext | null,
    providerOverride?: BackupProvider,
    existingRecordId?: string,
  ): Promise<BackupRecord> {
    const settings = await this.repo.getOrCreateSettings();
    const requested = providerOverride ?? settings.provider;
    const storageProvider = this.storage.get(requested);
    // مزوّد سحابي غير مُهيّأ → تراجع آمن لـLOCAL (بلا إسقاط)
    const actualProvider: BackupProvider = storageProvider.configured ? requested : "LOCAL";

    const now = new Date();
    const compressed = settings.compressionEnabled;
    const filename = buildStoredBackupFilename(now, compressed);

    // سجل موجود (retry) أو جديد
    const record = existingRecordId
      ? await this.repo.updateRecord(existingRecordId, {
          status: "IN_PROGRESS",
          startedAt: now,
          error: null,
        })
      : await this.repo.createRecord({
          filename,
          provider: actualProvider,
          trigger,
          status: "IN_PROGRESS",
          compressed,
          encrypted: false, // راجع "القيود": التشفير مُخزَّن كإعداد لا يُطبَّق هذه المرحلة
          createdById: actor?.id ?? null,
        });

    const start = Date.now();
    try {
      const data = await this.repo.collectAll();
      const counts = this.countsOf(data);
      const payload = this.wrapPayload(data, actor);

      const dir = resolveBackupDir();
      await mkdir(dir, { recursive: true });
      const filePath = join(dir, record.filename);

      const json = JSON.stringify(payload, null, 2);
      const source = Readable.from([json]);
      if (compressed) {
        await pipeline(source, createGzip(), createWriteStream(filePath));
      } else {
        await pipeline(source, createWriteStream(filePath));
      }

      const [checksum, fileStat] = await Promise.all([
        computeFileChecksum(filePath),
        stat(filePath),
      ]);

      const durationMs = Date.now() - start;
      const updated = await this.repo.updateRecord(record.id, {
        status: "COMPLETED",
        storagePath: filePath,
        sizeBytes: fileStat.size,
        checksum,
        appVersion: APPLICATION_VERSION,
        counts,
        durationMs,
        completedAt: new Date(),
      });

      if (actor && ctx) {
        await this.repo.createAuditLog({
          action: "SYSTEM_BACKUP_CREATED",
          userId: actor.id,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
          metadata: { backupId: record.id, filename: record.filename, counts, provider: actualProvider },
        });
      }
      notificationBus.emitNotification({
        type: "BACKUP_COMPLETED",
        data: { triggeredByEmail: actor?.email ?? "system@scheduler" },
      });
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const failed = await this.repo.updateRecord(record.id, {
        status: "FAILED",
        error: message,
        durationMs: Date.now() - start,
        completedAt: new Date(),
      });
      notificationBus.emitNotification({
        type: "BACKUP_FAILED",
        data: { triggeredByEmail: actor?.email ?? "system@scheduler", errorMessage: message },
      });
      if (actor) throw err; // يدوي: يُبلَّغ المستخدم؛ مُجدول: يُبتلع (السجل يحمل الفشل)
      return failed;
    }
  }

  // ==================== History / Download / Delete / Cleanup / Retry ====================

  listHistory(query: HistoryQuery): Promise<ListBackupHistoryResult> {
    return this.repo.listHistory(query);
  }

  /** يعيد stream للملف المخزَّن للتنزيل - يتحقّق من وجوده على القرص */
  async openBackupFile(id: string): Promise<{ stream: ReadStream; filename: string; size: number }> {
    const record = await this.repo.findRecordById(id);
    if (!record || !record.storagePath) {
      throw new BackupNotFoundError("Backup file not found");
    }
    try {
      await access(record.storagePath, constants.R_OK);
    } catch {
      throw new BackupNotFoundError("Backup file missing on disk");
    }
    const fileStat = await stat(record.storagePath);
    return {
      stream: createReadStream(record.storagePath),
      filename: record.filename,
      size: fileStat.size,
    };
  }

  async deleteRecord(id: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<void> {
    const record = await this.repo.findRecordById(id);
    if (!record) throw new BackupNotFoundError("Backup not found");

    await this.removeFileQuiet(record.storagePath);
    await this.repo.softDeleteRecord(id);
    await this.repo.createAuditLog({
      action: "BACKUP_DELETED",
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { backupId: id, filename: record.filename },
    });
  }

  /** تنظيف النسخ الأقدم من retention مع حماية آخر keepLastN ناجحة */
  async cleanup(actor: AuthenticatedUser, ctx: RequestContext): Promise<{ deleted: number }> {
    const settings = await this.repo.getOrCreateSettings();
    const candidates = await this.repo.findCleanupCandidates(
      settings.retentionDays,
      settings.keepLastN,
    );
    for (const record of candidates) {
      await this.removeFileQuiet(record.storagePath);
      await this.repo.softDeleteRecord(record.id);
    }
    await this.repo.createAuditLog({
      action: "BACKUP_DELETED",
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: {
        cleanup: true,
        deleted: candidates.length,
        retentionDays: settings.retentionDays,
        keepLastN: settings.keepLastN,
      },
    });
    return { deleted: candidates.length };
  }

  /** إعادة محاولة نسخة فاشلة - نفس السجل، retryCount++ (بلا سجل جديد) */
  async retry(id: string, actor: AuthenticatedUser, ctx: RequestContext): Promise<BackupRecord> {
    const record = await this.repo.findRecordById(id);
    if (!record) throw new BackupNotFoundError("Backup not found");
    if (record.status !== "FAILED") {
      throw new BackupConflictError("Only failed backups can be retried");
    }
    await this.repo.updateRecord(id, { retryCount: record.retryCount + 1 });
    await this.repo.createAuditLog({
      action: "BACKUP_RETRIED",
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { backupId: id, attempt: record.retryCount + 1 },
    });
    return this.createStoredBackup("MANUAL", actor, ctx, record.provider, id);
  }

  // ==================== Restore ====================

  /** يفحص الملف المرفوع بلا أي كتابة - Checksum/Version/Counts/Warnings */
  restorePreview(buffer: Buffer): RestorePreview {
    const checksum = computeBufferChecksum(buffer);
    const warnings: string[] = [];
    let payload: BackupPayload | null = null;
    try {
      payload = JSON.parse(buffer.toString("utf-8"), reviveDates) as BackupPayload;
    } catch {
      return {
        valid: false,
        checksum,
        metadata: null,
        counts: null,
        versionMatch: false,
        currentVersion: APPLICATION_VERSION,
        warnings: ["الملف ليس JSON صالحاً"],
      };
    }

    const valid = this.isValidPayload(payload);
    if (!valid) warnings.push("بنية النسخة غير مكتملة أو غير متوافقة");
    const versionMatch = payload.metadata?.applicationVersion === APPLICATION_VERSION;
    if (!versionMatch) {
      warnings.push(
        `نسخة التطبيق بالملف (${payload.metadata?.applicationVersion ?? "غير معروفة"}) تختلف عن الحالية (${APPLICATION_VERSION})`,
      );
    }
    warnings.push(
      "المستخدمون: تُحدَّث الحقول الآمنة فقط للموجودين - كلمات السر والجلسات لا تُلمس، والمستخدم غير الموجود يُتخطّى",
    );

    return {
      valid,
      checksum,
      metadata: payload.metadata ?? null,
      counts: valid ? this.countsOf(payload) : null,
      versionMatch,
      currentVersion: APPLICATION_VERSION,
      warnings,
    };
  }

  async restore(
    buffer: Buffer,
    actor: AuthenticatedUser,
    ctx: RequestContext,
    expectedChecksum?: string,
  ): Promise<RestoreResult> {
    const checksum = computeBufferChecksum(buffer);
    if (expectedChecksum && expectedChecksum !== checksum) {
      throw new BackupValidationError("Checksum mismatch - file changed since preview");
    }

    let payload: BackupPayload;
    try {
      payload = JSON.parse(buffer.toString("utf-8"), reviveDates) as BackupPayload;
    } catch {
      throw new BackupValidationError("Invalid JSON backup file");
    }
    if (!this.isValidPayload(payload)) {
      throw new BackupValidationError("Incomplete or incompatible backup structure");
    }

    const result = await this.repo.restoreBusinessData(payload);

    await this.repo.createAuditLog({
      action: "BACKUP_RESTORED",
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: {
        checksum,
        version: payload.metadata?.applicationVersion ?? null,
        restored: result.restored,
        usersPreserved: result.usersPreserved,
        durationMs: result.durationMs,
      },
    });
    return result;
  }

  // ==================== Statistics / Health ====================

  async getStatistics(): Promise<BackupStatistics> {
    const [agg, settings] = await Promise.all([
      this.repo.aggregateStatistics(),
      this.repo.getOrCreateSettings(),
    ]);
    return {
      total: agg.total,
      successful: agg.successful,
      failed: agg.failed,
      storageUsedBytes: agg.sizeSum,
      averageSizeBytes: Math.round(agg.sizeAvg ?? 0),
      averageDurationMs: Math.round(agg.durationAvg ?? 0),
      lastBackupAt: agg.lastBackup?.createdAt.toISOString() ?? null,
      nextBackupAt: settings.scheduleEnabled ? (settings.nextRunAt?.toISOString() ?? null) : null,
    };
  }

  async getHealth(): Promise<BackupHealth> {
    const [settings, agg] = await Promise.all([
      this.repo.getOrCreateSettings(),
      this.repo.aggregateStatistics(),
    ]);
    const dir = resolveBackupDir();
    const writable = await this.isDirWritable(dir);

    const checks: BackupHealthCheck[] = [];
    checks.push(
      writable
        ? { key: "storage", label: "التخزين المحلي", level: "HEALTHY", detail: dir }
        : { key: "storage", label: "التخزين المحلي", level: "CRITICAL", detail: `تعذّرت الكتابة في ${dir}` },
    );

    // آخر نسخة ناجحة
    if (!agg.lastBackup) {
      checks.push({ key: "last", label: "آخر نسخة", level: "WARNING", detail: "لا توجد نسخة ناجحة بعد" });
    } else {
      const ageHours = (Date.now() - agg.lastBackup.createdAt.getTime()) / 3_600_000;
      checks.push(
        ageHours > 24 * 7
          ? { key: "last", label: "آخر نسخة", level: "WARNING", detail: `آخر نسخة قبل ${Math.floor(ageHours / 24)} يوم` }
          : { key: "last", label: "آخر نسخة", level: "HEALTHY", detail: agg.lastBackup.createdAt.toISOString() },
      );
    }

    // الجدولة
    checks.push(
      settings.scheduleEnabled
        ? { key: "schedule", label: "الجدولة", level: "HEALTHY", detail: `مفعّلة - القادمة ${settings.nextRunAt?.toISOString() ?? "غير محسوبة"}` }
        : { key: "schedule", label: "الجدولة", level: "WARNING", detail: "غير مفعّلة" },
    );

    // فشل متتالٍ بالجدولة
    if (settings.scheduleRetryCount >= 3) {
      checks.push({ key: "scheduleFailures", label: "فشل الجدولة", level: "CRITICAL", detail: `${settings.scheduleRetryCount} محاولات فاشلة متتالية` });
    }

    // التشفير (مُخزَّن لا يُطبَّق هذه المرحلة - شفافية)
    if (settings.encryptionEnabled) {
      checks.push({
        key: "encryption",
        label: "التشفير",
        level: "WARNING",
        detail: env.BACKUP_ENCRYPTION_KEY
          ? "مفعّل بالإعدادات - التطبيق الفعلي مؤجَّل (قيد Phase 6)"
          : "مفعّل بالإعدادات لكن BACKUP_ENCRYPTION_KEY غير مضبوط",
      });
    }

    const level = this.worstLevel(checks.map((c) => c.level));
    return {
      level,
      checks,
      storage: { dir, writable },
      providers: this.storage.statusList(),
      lastBackupAt: agg.lastBackup?.createdAt.toISOString() ?? null,
      nextBackupAt: settings.scheduleEnabled ? (settings.nextRunAt?.toISOString() ?? null) : null,
    };
  }

  // ==================== Settings ====================

  getSettings(): Promise<BackupSettingsResponse> {
    return this.repo.getOrCreateSettings();
  }

  async updateSettings(
    input: UpdateBackupSettingsInput,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<BackupSettingsResponse> {
    await this.repo.getOrCreateSettings();
    const updated = await this.repo.updateSettings(input);

    // إعادة حساب nextRunAt عند تغيّر الجدولة
    const next =
      updated.scheduleEnabled
        ? computeNextRun(updated.scheduleFrequency, updated.scheduleTime)
        : null;
    const final = await this.repo.updateSettings({ nextRunAt: next });

    await this.repo.createAuditLog({
      action: "BACKUP_SETTINGS_UPDATED",
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { changes: input },
    });
    return final;
  }

  // ==================== Scheduler entrypoint ====================

  /** يُستدعى من Scheduler كل دقيقة - يشغّل النسخة إن حان موعدها */
  async runDueScheduledBackup(): Promise<void> {
    const settings = await this.repo.getOrCreateSettings();
    if (!settings.scheduleEnabled) return;

    const now = new Date();
    // احسب nextRunAt أول مرة إن كان فارغاً
    if (!settings.nextRunAt) {
      await this.repo.updateSettings({
        nextRunAt: computeNextRun(settings.scheduleFrequency, settings.scheduleTime, now),
      });
      return;
    }
    if (settings.nextRunAt.getTime() > now.getTime()) return;

    const record = await this.createStoredBackup("SCHEDULED", null, null);
    const success = record.status === "COMPLETED";
    await this.repo.updateSettings({
      lastRunAt: now,
      ...(success ? { lastSuccessAt: now, scheduleRetryCount: 0 } : { lastFailureAt: now, scheduleRetryCount: settings.scheduleRetryCount + 1 }),
      nextRunAt: computeNextRun(settings.scheduleFrequency, settings.scheduleTime, now),
    });
  }

  // ==================== Helpers ====================

  private wrapPayload(
    data: Omit<BackupPayload, "metadata">,
    actor: AuthenticatedUser | null,
  ): BackupPayload {
    return {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: { id: actor?.id ?? "system", email: actor?.email ?? "system@scheduler" },
        applicationName: APPLICATION_NAME,
        applicationVersion: APPLICATION_VERSION,
        environment: env.NODE_ENV,
      },
      ...data,
    };
  }

  private countsOf(data: Omit<BackupPayload, "metadata">): BackupCounts {
    return {
      branches: data.branches.length,
      users: data.users.length,
      customers: data.customers.length,
      serviceCategories: data.serviceCategories.length,
      services: data.services.length,
      orders: data.orders.length,
      orderItems: data.orderItems.length,
      orderStatusHistory: data.orderStatusHistory.length,
      payments: data.payments.length,
      auditLogs: data.auditLogs.length,
    };
  }

  private isValidPayload(payload: BackupPayload | null): payload is BackupPayload {
    return Boolean(
      payload &&
        Array.isArray(payload.branches) &&
        Array.isArray(payload.users) &&
        Array.isArray(payload.customers) &&
        Array.isArray(payload.orders) &&
        Array.isArray(payload.payments),
    );
  }

  private async removeFileQuiet(path: string | null): Promise<void> {
    if (!path) return;
    try {
      await rm(path, { force: true });
    } catch {
      // ملف مفقود/غير قابل للحذف - لا يُفشِل الحذف المنطقي بقاعدة البيانات
    }
  }

  private async isDirWritable(dir: string): Promise<boolean> {
    try {
      await mkdir(dir, { recursive: true });
      await access(dir, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private worstLevel(levels: HealthLevel[]): HealthLevel {
    if (levels.includes("CRITICAL")) return "CRITICAL";
    if (levels.includes("WARNING")) return "WARNING";
    return "HEALTHY";
  }
}

// ==================== أخطاء الوحدة (تُحوَّل لـApiError بالـController) ====================

export class BackupNotFoundError extends Error {}
export class BackupConflictError extends Error {}
export class BackupValidationError extends Error {}
