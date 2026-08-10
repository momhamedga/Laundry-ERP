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
import { BACKUP_TABLES, SETTINGS_KEY } from "./backup.tables.js";
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

      /**
       * الرفع بعد اكتمال الكتابة والبصمة: نرفع ملفاً تامّاً مُتحقَّقاً منه لا
       * تدفّقاً قد ينقطع. والملف يبقى محلياً أيضاً — السحابة نسخة ثانية لا بديل.
       *
       * فشل الرفع لا يُفشِل النسخة: الملف على القرص سليم وبصمته مُتحقَّقة، ووسمه
       * FAILED كذبٌ يدفع المستخدم لإعادة عملٍ تمّ. يُسجَّل المزوّد الفعلي LOCAL
       * ويُحفظ سبب الفشل في السجلّ ليظهر في اللوحة — لا يُبتلع ولا يُبالَغ فيه.
       */
      let storedProvider: BackupProvider = actualProvider;
      let cloudError: string | null = null;
      if (actualProvider !== "LOCAL") {
        try {
          await storageProvider.persist(filePath, record.filename);
        } catch (err) {
          console.error("💥 فشل رفع النسخة إلى التخزين السحابي:", err);
          storedProvider = "LOCAL";
          cloudError = `النسخة سليمة محلياً، لكن تعذّر رفعها إلى التخزين السحابي: ${
            err instanceof Error ? err.message : "خطأ غير معروف"
          }`;
        }
      }

      const durationMs = Date.now() - start;
      const updated = await this.repo.updateRecord(record.id, {
        status: "COMPLETED",
        provider: storedProvider,
        error: cloudError,
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
      throw new BackupNotFoundError("ملف النسخة الاحتياطية غير موجود.");
    }

    const onDisk = await access(record.storagePath, constants.R_OK).then(
      () => true,
      () => false,
    );

    /**
     * القرص أولاً ثم السحابة: القراءة المحلية أسرع وبلا تكلفة، والسحابة هي
     * السبب الذي من أجله وُجدت — أن يبقى للنسخة مصدرٌ ثانٍ حين يختفي الأول.
     * قبل هذا كان اختفاء الملف محلياً يعني ضياعه ولو كان في السحابة.
     */
    if (!onDisk) {
      if (record.provider === "LOCAL") {
        throw new BackupNotFoundError(
          "سجلّ النسخة موجود لكن ملفها غير موجود على القرص، ولا نسخة سحابية لها.",
        );
      }
      const buffer = await this.storage
        .get(record.provider)
        .fetch(record.filename)
        .catch((err: unknown) => {
          console.error("💥 فشل جلب النسخة من التخزين السحابي:", err);
          throw new BackupNotFoundError(
            "الملف غير موجود على القرص وتعذّر جلبه من التخزين السحابي.",
          );
        });
      return {
        stream: Readable.from([buffer]) as unknown as ReadStream,
        filename: record.filename,
        size: buffer.byteLength,
      };
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
    if (!record) throw new BackupNotFoundError("النسخة الاحتياطية غير موجودة.");

    await this.removeStoredFile(record);
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
      await this.removeStoredFile(record);
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
    if (!record) throw new BackupNotFoundError("النسخة الاحتياطية غير موجودة.");
    if (record.status !== "FAILED") {
      throw new BackupConflictError("لا تُعاد المحاولة إلا للنسخ الفاشلة.");
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
      throw new BackupValidationError("بصمة الملف لا تطابق المعاينة — تغيّر الملف بعد فحصه.");
    }

    let payload: BackupPayload;
    try {
      payload = JSON.parse(buffer.toString("utf-8"), reviveDates) as BackupPayload;
    } catch {
      throw new BackupValidationError("ملف النسخة الاحتياطية ليس JSON صالحاً.");
    }
    if (!this.isValidPayload(payload)) {
      throw new BackupValidationError("بنية النسخة الاحتياطية ناقصة أو غير متوافقة.");
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

    /**
     * التخزين السحابي — فحص اتصال فعلي لا مجرّد «هل المتغيّرات موجودة».
     *
     * مفتاح منتهٍ أو bucket محذوف أو صلاحية قراءة فقط: كلّها تُبقي المتغيّرات
     * موجودة بينما لا يصل شيء إلى السحابة. اكتشاف ذلك يوم الحاجة متأخّر جداً،
     * فيُفحص هنا مع كل عرض للوحة.
     */
    const cloud = await this.storage.probeCloud();
    if (!cloud.configured) {
      checks.push({
        key: "cloud",
        label: "التخزين السحابي",
        level: "WARNING",
        detail: "غير مُعَدّ — النسخ على قرص الخادم وحده",
      });
    } else if (cloud.ok) {
      checks.push({
        key: "cloud",
        label: "التخزين السحابي",
        level: "HEALTHY",
        detail: `Backblaze B2 — متصل (${env.BACKUP_B2_BUCKET ?? ""})`,
      });
    } else {
      checks.push({
        key: "cloud",
        label: "التخزين السحابي",
        level: "CRITICAL",
        detail: `مُعَدّ لكن الاتصال فاشل: ${cloud.error ?? "سبب غير معروف"}`,
      });
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

  /**
   * أعداد كل جدول مشمول — مقادة بالسِجِلّ فتشمل أي جدول يُضاف تلقائياً.
   * الجدول الغائب (ملف نسخة أقدم) يُعدّ صفراً لا يُسقِط المعاينة.
   */
  private countsOf(data: Omit<BackupPayload, "metadata">): BackupCounts {
    const counts: BackupCounts = {};
    const bag = data as unknown as Record<string, unknown>;

    for (const table of BACKUP_TABLES) {
      if (table.key === SETTINGS_KEY) {
        counts[SETTINGS_KEY] = bag[SETTINGS_KEY] ? 1 : 0;
        continue;
      }
      const rows = bag[table.key];
      counts[table.key] = Array.isArray(rows) ? rows.length : 0;
    }
    return counts;
  }

  /**
   * فحص بنية الملف المرفوع.
   *
   * يُشترط وجود الجداول الأساسية القديمة فقط، لا كل جدول في السِجِلّ: ملفٌ
   * أُنشئ قبل توسعة التغطية صالحٌ للاستعادة، ويُستعاد منه ما فيه ويُتخطّى ما
   * ليس فيه. اشتراط الاكتمال كان سيرفض كل نسخة قديمة يملكها المستخدم.
   */
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

  /**
   * يحذف الملف محلياً ومن السحابة معاً.
   *
   * حذف السجلّ بلا حذف النسخة السحابية يترك ملفات لا يعرف أحد بوجودها تستهلك
   * مساحة وتُفوتَر إلى الأبد — وتحمل بيانات عملاء يُفترض أنها حُذفت.
   */
  private async removeStoredFile(record: {
    storagePath: string | null;
    filename: string;
    provider: BackupProvider;
  }): Promise<void> {
    if (record.storagePath) {
      try {
        await rm(record.storagePath, { force: true });
      } catch {
        // ملف مفقود/غير قابل للحذف - لا يُفشِل الحذف المنطقي بقاعدة البيانات
      }
    }
    if (record.provider !== "LOCAL") {
      try {
        await this.storage.get(record.provider).remove(record.filename);
      } catch (err) {
        // الحذف من السحابة أفضل جهد — يُسجَّل ولا يمنع حذف السجلّ
        console.error("💥 تعذّر حذف النسخة من التخزين السحابي:", err);
      }
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
