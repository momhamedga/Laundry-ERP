import type {
  AuditAction,
  BackupRecord,
  BackupSettings,
  Prisma,
  PrismaClient,
  User,
} from "@prisma/client";
import { toSafeUser } from "../auth/auth.utils.js";
import { BACKUP_TABLES, SETTINGS_KEY, USERS_KEY } from "./backup.tables.js";
import type { HistoryQuery } from "./backup.validator.js";
import type {
  BackupCounts,
  BackupPayload,
  BackupPayloadMap,
  BackupRow,
  ListBackupHistoryResult,
  RestoreResult,
} from "./backup.types.js";

const SETTINGS_SINGLETON_ID = "singleton";

/** الحد الأدنى من واجهة delegate الذي تستخدمه هذه الوحدة */
interface PrismaDelegate {
  findMany(args?: unknown): Promise<unknown[]>;
  upsert(args: unknown): Promise<unknown>;
}

/** يحوّل سلاسل ISO-8601 لكائنات Date عند تحليل JSON المرفوع (Prisma يتوقّع Date للحقول الزمنية) */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
export function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value === "string" && ISO_DATE_RE.test(value)) return new Date(value);
  return value;
}

/**
 * Repository Pattern - قراءة عابرة للوحدات عمداً (نفس سابقة stats.repository.ts
 * الذي يقرأ من Orders/Customers/Payments مباشرة) - النسخ الاحتياطي طبيعته
 * تصدير كل شيء، فليست انتهاكاً لحدود الوحدات بل نمطاً مُعترَفاً به بالمشروع.
 */
export class BackupRepository {
  constructor(private readonly db: PrismaClient) {}

  /**
   * يجمع كل جدول مُدرَج في BACKUP_TABLES.
   *
   * القراءة بالتكرار على السِجِلّ لا بقائمة استعلامات مكتوبة يدوياً: القائمة
   * اليدوية هي بالضبط ما تخلّف عن المخطّط حتى صارت النسخة تغطّي 10 جداول من 48.
   * أي جدول يُضاف للسِجِلّ يُصدَّر ويُستعاد بلا لمس هذا الملف.
   *
   * الترتيب بـid تصاعدياً لا createdAt: ليس كل نموذج يحمل createdAt، وثبات
   * الترتيب هو المطلوب هنا (بصمة الملف تتغيّر مع ترتيب مختلف لنفس البيانات).
   */
  async collectAll(): Promise<Omit<BackupPayload, "metadata">> {
    const out: Record<string, unknown> = {};

    for (const table of BACKUP_TABLES) {
      if (table.key === SETTINGS_KEY) {
        out[SETTINGS_KEY] = await this.db.systemSettings.findUnique({
          where: { id: SETTINGS_SINGLETON_ID },
        });
        continue;
      }

      const rows = await this.delegateFor(table.delegate).findMany({ orderBy: { id: "asc" } });

      // المستخدمون وحدهم يمرّون بالتعقيم — لا passwordHash ولا رموز إعادة تعيين
      out[table.key] =
        table.key === USERS_KEY ? (rows as unknown as User[]).map(toSafeUser) : rows;
    }

    return out as unknown as Omit<BackupPayload, "metadata">;
  }

  /**
   * delegate الخاص بجدول من السِجِلّ.
   *
   * التحويل هنا هو الثمن المقصود لقيادة الوحدة بسِجِلّ واحد: أنواع Prisma
   * المُولَّدة لا تسمح بفهرسة العميل باسم نصّي. الحارس في tests/backup يضمن
   * أن كل اسم في السِجِلّ نموذجٌ حقيقي في المخطّط، والفحص أدناه يمنع مرور
   * اسم خاطئ صامتاً وقت التشغيل.
   */
  private delegateFor(name: string): PrismaDelegate {
    const delegate = (this.db as unknown as Record<string, PrismaDelegate | undefined>)[name];
    if (!delegate || typeof delegate.findMany !== "function") {
      throw new Error(`جدول غير معروف في عميل Prisma: ${name}`);
    }
    return delegate;
  }

  createAuditLog(entry: {
    action: AuditAction;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Prisma.InputJsonValue;
  }): Promise<unknown> {
    return this.db.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        metadata: entry.metadata,
      },
    });
  }

  // ==================== Phase 6: BackupRecord ====================

  createRecord(data: Prisma.BackupRecordUncheckedCreateInput): Promise<BackupRecord> {
    return this.db.backupRecord.create({ data });
  }

  updateRecord(id: string, data: Prisma.BackupRecordUncheckedUpdateInput): Promise<BackupRecord> {
    return this.db.backupRecord.update({ where: { id }, data });
  }

  findRecordById(id: string): Promise<BackupRecord | null> {
    return this.db.backupRecord.findFirst({ where: { id, deletedAt: null } });
  }

  /** يشمل المحذوف ناعماً - لعمليات داخلية (حذف الملف مثلاً) */
  findRecordByIdRaw(id: string): Promise<BackupRecord | null> {
    return this.db.backupRecord.findUnique({ where: { id } });
  }

  async listHistory(query: HistoryQuery): Promise<ListBackupHistoryResult> {
    const where: Prisma.BackupRecordWhereInput = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.provider) where.provider = query.provider;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    if (query.search) {
      where.OR = [
        { filename: { contains: query.search, mode: "insensitive" } },
        { error: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [backups, total] = await Promise.all([
      this.db.backupRecord.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take: query.limit,
      }),
      this.db.backupRecord.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / query.limit));
    return {
      backups,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    };
  }

  softDeleteRecord(id: string): Promise<BackupRecord> {
    return this.db.backupRecord.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** مرشّحو التنظيف: المحذوفون منطقياً أقدم من retention مع تجاوز آخر keepLastN ناجحة */
  async findCleanupCandidates(retentionDays: number, keepLastN: number): Promise<BackupRecord[]> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    // آخر N نسخة ناجحة تُحمى دائماً بصرف النظر عن العمر
    const protectedIds = new Set(
      (
        await this.db.backupRecord.findMany({
          where: { deletedAt: null, status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: keepLastN,
          select: { id: true },
        })
      ).map((r) => r.id),
    );

    const old = await this.db.backupRecord.findMany({
      where: { deletedAt: null, createdAt: { lt: cutoff } },
      orderBy: { createdAt: "asc" },
    });
    return old.filter((r) => !protectedIds.has(r.id));
  }

  aggregateStatistics(): Promise<{
    total: number;
    successful: number;
    failed: number;
    sizeSum: number;
    sizeAvg: number | null;
    durationAvg: number | null;
    lastBackup: BackupRecord | null;
  }> {
    return (async () => {
      const [total, successful, failed, agg, lastBackup] = await Promise.all([
        this.db.backupRecord.count({ where: { deletedAt: null } }),
        this.db.backupRecord.count({ where: { deletedAt: null, status: "COMPLETED" } }),
        this.db.backupRecord.count({ where: { deletedAt: null, status: "FAILED" } }),
        this.db.backupRecord.aggregate({
          where: { deletedAt: null, status: "COMPLETED" },
          _sum: { sizeBytes: true },
          _avg: { sizeBytes: true, durationMs: true },
        }),
        this.db.backupRecord.findFirst({
          where: { deletedAt: null, status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      return {
        total,
        successful,
        failed,
        sizeSum: agg._sum.sizeBytes ?? 0,
        sizeAvg: agg._avg.sizeBytes,
        durationAvg: agg._avg.durationMs,
        lastBackup,
      };
    })();
  }

  // ==================== Phase 6: BackupSettings ====================

  async getOrCreateSettings(): Promise<BackupSettings> {
    const existing = await this.db.backupSettings.findUnique({
      where: { id: SETTINGS_SINGLETON_ID },
    });
    if (existing) return existing;
    return this.db.backupSettings.create({ data: { id: SETTINGS_SINGLETON_ID } });
  }

  updateSettings(data: Prisma.BackupSettingsUpdateInput): Promise<BackupSettings> {
    return this.db.backupSettings.update({ where: { id: SETTINGS_SINGLETON_ID }, data });
  }

  // ==================== Phase 6: Restore (Atomic, auth-preserving) ====================

  /**
   * استعادة بيانات العمل بمعاملة ذرّية واحدة (rollback تلقائي عند أي خطأ).
   * upsert بالـid بترتيب FK آمن (الآباء قبل الأبناء) - لا حذف (يتفادى قيود
   * Restrict وأيتام الفواتير/الإشعارات غير المشمولة بالنسخة). المستخدمون:
   * تحديث الحقول الآمنة فقط للموجودين - passwordHash/tokens بلا لمس إطلاقاً؛
   * المستخدم غير الموجود يُتخطّى (النسخة لا تحوي passwordHash فيتعذّر إنشاؤه).
   */
  async restoreBusinessData(payload: BackupPayload): Promise<RestoreResult> {
    const start = Date.now();

    const result = await this.db.$transaction(
      async (tx) => {
        let usersPreserved = 0;
        const restored: BackupCounts = {};
        const bag = payload as unknown as BackupPayloadMap;

        // نفس ترتيب السِجِلّ — وهو ترتيب المفاتيح الأجنبية الذي يحرسه اختبار
        // tests/backup/coverage: أي أب بعد ابنه يُوقف CI قبل أن يُوقف الاستعادة.
        for (const table of BACKUP_TABLES) {
          if (table.key === SETTINGS_KEY) {
            const s = payload.settings;
            if (s) await tx.systemSettings.upsert({ where: { id: s.id }, create: s, update: s });
            restored[SETTINGS_KEY] = s ? 1 : 0;
            continue;
          }

          // ملف نسخة أقدم لا يحوي الجدول أصلاً — يُتخطّى بلا فشل الاستعادة كلّها
          const rows = bag[table.key];
          if (!Array.isArray(rows)) {
            restored[table.key] = 0;
            continue;
          }

          if (table.key === USERS_KEY) {
            usersPreserved = await this.restoreUsers(tx, rows as BackupRow[]);
            restored[USERS_KEY] = usersPreserved;
            continue;
          }

          const delegate = (tx as unknown as Record<string, PrismaDelegate | undefined>)[
            table.delegate
          ];
          if (!delegate || typeof delegate.upsert !== "function") {
            throw new Error(`جدول غير معروف في عميل Prisma: ${table.delegate}`);
          }
          for (const row of rows as BackupRow[]) {
            await delegate.upsert({ where: { id: row.id }, create: row, update: row });
          }
          restored[table.key] = rows.length;
        }

        return { restored, usersPreserved };
      },
      { timeout: 120_000 },
    );

    return { ...result, durationMs: Date.now() - start };
  }

  /**
   * المستخدمون: تحديث الحقول الآمنة فقط للموجودين — passwordHash والرموز
   * بلا لمس إطلاقاً، فالنسخة لا تحملها أصلاً.
   *
   * المستخدم غير الموجود يُتخطّى ولا يُنشأ: إنشاؤه يستلزم اختلاق كلمة سرّ،
   * والاستعادة ليست موضع إنشاء حسابات. أثرُ ذلك مقصود ويجب معرفته — استعادة
   * إلى قاعدة فارغة تُرجِع بيانات العمل كاملة بلا حسابات دخول، فيلزم إنشاء
   * حساب مدير أولاً ثم الاستعادة.
   */
  private async restoreUsers(
    tx: Prisma.TransactionClient,
    rows: readonly BackupRow[],
  ): Promise<number> {
    let count = 0;
    for (const row of rows) {
      const existing = await tx.user.findUnique({ where: { id: row.id }, select: { id: true } });
      if (!existing) continue;
      await tx.user.update({
        where: { id: row.id },
        data: {
          name: row.name as string,
          phone: row.phone as string | null,
          role: row.role as User["role"],
          isActive: row.isActive as boolean,
          avatarUrl: row.avatarUrl as string | null,
          branchId: row.branchId as string | null,
        },
      });
      count++;
    }
    return count;
  }
}
