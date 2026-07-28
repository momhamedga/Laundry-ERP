import type {
  AuditAction,
  BackupRecord,
  BackupSettings,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { toSafeUser } from "../auth/auth.utils.js";
import type { HistoryQuery } from "./backup.validator.js";
import type {
  BackupCounts,
  BackupPayload,
  ListBackupHistoryResult,
  RestoreResult,
} from "./backup.types.js";

const SETTINGS_SINGLETON_ID = "singleton";

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

  async collectAll(): Promise<Omit<BackupPayload, "metadata">> {
    const [
      branches,
      usersRaw,
      customers,
      serviceCategories,
      services,
      orders,
      orderItems,
      orderStatusHistory,
      payments,
      auditLogs,
      settings,
    ] = await Promise.all([
      this.db.branch.findMany({ orderBy: { createdAt: "asc" } }),
      this.db.user.findMany({ orderBy: { createdAt: "asc" } }),
      this.db.customer.findMany({ orderBy: { createdAt: "asc" } }),
      this.db.serviceCategory.findMany({ orderBy: { createdAt: "asc" } }),
      this.db.service.findMany({ orderBy: { createdAt: "asc" } }),
      this.db.order.findMany({ orderBy: { createdAt: "asc" } }),
      this.db.orderItem.findMany({ orderBy: { id: "asc" } }),
      this.db.orderStatusHistory.findMany({ orderBy: { createdAt: "asc" } }),
      this.db.payment.findMany({ orderBy: { createdAt: "asc" } }),
      this.db.auditLog.findMany({ orderBy: { createdAt: "asc" } }),
      this.db.systemSettings.findUnique({ where: { id: "singleton" } }),
    ]);

    return {
      branches,
      users: usersRaw.map(toSafeUser), // بلا passwordHash/tokens أبداً
      customers,
      serviceCategories,
      services,
      orders,
      orderItems,
      orderStatusHistory,
      payments,
      auditLogs,
      settings,
    };
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

        for (const b of payload.branches) {
          await tx.branch.upsert({ where: { id: b.id }, create: b, update: b });
        }
        for (const c of payload.serviceCategories) {
          await tx.serviceCategory.upsert({ where: { id: c.id }, create: c, update: c });
        }
        for (const s of payload.services) {
          await tx.service.upsert({ where: { id: s.id }, create: s, update: s });
        }

        // المستخدمون: تحديث الحقول الآمنة فقط للموجودين (الحفاظ على المصادقة)
        for (const u of payload.users) {
          const existing = await tx.user.findUnique({ where: { id: u.id }, select: { id: true } });
          if (!existing) continue; // لا يمكن إنشاء مستخدم بلا passwordHash - يُتخطّى
          await tx.user.update({
            where: { id: u.id },
            data: {
              name: u.name,
              phone: u.phone,
              role: u.role,
              isActive: u.isActive,
              avatarUrl: u.avatarUrl,
              branchId: u.branchId,
            },
          });
          usersPreserved++;
        }

        for (const c of payload.customers) {
          await tx.customer.upsert({ where: { id: c.id }, create: c, update: c });
        }
        for (const o of payload.orders) {
          await tx.order.upsert({ where: { id: o.id }, create: o, update: o });
        }
        for (const it of payload.orderItems) {
          await tx.orderItem.upsert({ where: { id: it.id }, create: it, update: it });
        }
        for (const h of payload.orderStatusHistory) {
          await tx.orderStatusHistory.upsert({ where: { id: h.id }, create: h, update: h });
        }
        for (const p of payload.payments) {
          await tx.payment.upsert({ where: { id: p.id }, create: p, update: p });
        }
        if (payload.settings) {
          const s = payload.settings;
          await tx.systemSettings.upsert({ where: { id: s.id }, create: s, update: s });
        }

        const restored: BackupCounts = {
          branches: payload.branches.length,
          users: usersPreserved,
          customers: payload.customers.length,
          serviceCategories: payload.serviceCategories.length,
          services: payload.services.length,
          orders: payload.orders.length,
          orderItems: payload.orderItems.length,
          orderStatusHistory: payload.orderStatusHistory.length,
          payments: payload.payments.length,
          auditLogs: 0,
        };
        return { restored, usersPreserved };
      },
      { timeout: 120_000 },
    );

    return { ...result, durationMs: Date.now() - start };
  }
}
