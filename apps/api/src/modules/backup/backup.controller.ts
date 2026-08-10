import type { Request, RequestHandler } from "express";
import { ApiError } from "../../middlewares/error.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../auth/auth.utils.js";
import type { AuthenticatedUser } from "../auth/index.js";
import {
  BackupConflictError,
  BackupNotFoundError,
  BackupValidationError,
  type BackupService,
} from "./backup.service.js";
import { buildBackupFilename } from "./backup.utils.js";
import {
  createBackupSchema,
  historyQuerySchema,
  restoreConfirmSchema,
  updateBackupSettingsSchema,
} from "./backup.validator.js";

/** يضمن وجود req.user - تُستدعى فقط بعد authenticate */
function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new ApiError(401, "يلزم تسجيل الدخول للمتابعة.");
  return req.user;
}

/** يحوّل أخطاء الوحدة لـApiError بالرمز المناسب */
function mapError(err: unknown): never {
  if (err instanceof BackupNotFoundError) throw new ApiError(404, err.message);
  if (err instanceof BackupConflictError) throw new ApiError(409, err.message);
  if (err instanceof BackupValidationError) throw new ApiError(400, err.message);
  throw err;
}

export class BackupController {
  constructor(private readonly service: BackupService) {}

  /**
   * GET /backup - تنزيل مباشر لملف JSON (السلوك الأصلي، بلا تغيير عقد)
   */
  download: RequestHandler = asyncHandler(async (req, res) => {
    const payload = await this.service.generate(requireUser(req), getRequestContext(req));
    const filename = buildBackupFilename(new Date());
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(JSON.stringify(payload, null, 2));
  });

  /** POST /backup - إنشاء نسخة مُخزَّنة على الخادم + تسجيلها */
  create: RequestHandler = asyncHandler(async (req, res) => {
    const input = createBackupSchema.parse(req.body ?? {});
    const record = await this.service.createStoredBackup(
      "MANUAL",
      requireUser(req),
      getRequestContext(req),
      input.provider,
    );
    sendSuccess(res, { backup: record }, "Backup created", 201);
  });

  /** GET /backup/history */
  history: RequestHandler = asyncHandler(async (req, res) => {
    const query = historyQuerySchema.parse(req.query);
    const { backups, meta } = await this.service.listHistory(query);
    sendSuccess(res, { backups }, undefined, 200, meta);
  });

  /** GET /backup/history/:id/download - تنزيل ملف نسخة مُخزَّنة (Streaming) */
  downloadStored: RequestHandler = asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (typeof id !== "string" || !id) throw new ApiError(400, "مُعرِّف النسخة الاحتياطية مفقود.");
    try {
      const { stream, filename, size } = await this.service.openBackupFile(id);
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", String(size));
      stream.pipe(res);
    } catch (err) {
      mapError(err);
    }
  });

  /** DELETE /backup/history/:id - حذف نسخة واحدة (Soft delete + حذف الملف) */
  remove: RequestHandler = asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (typeof id !== "string" || !id) throw new ApiError(400, "مُعرِّف النسخة الاحتياطية مفقود.");
    try {
      await this.service.deleteRecord(id, requireUser(req), getRequestContext(req));
      sendSuccess(res, { id }, "Backup deleted");
    } catch (err) {
      mapError(err);
    }
  });

  /** DELETE /backup/history - تنظيف النسخ القديمة (retention + keepLastN) */
  cleanup: RequestHandler = asyncHandler(async (req, res) => {
    const result = await this.service.cleanup(requireUser(req), getRequestContext(req));
    sendSuccess(res, result, `Cleaned up ${result.deleted} backup(s)`);
  });

  /** POST /backup/retry/:id - إعادة محاولة نسخة فاشلة */
  retry: RequestHandler = asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (typeof id !== "string" || !id) throw new ApiError(400, "مُعرِّف النسخة الاحتياطية مفقود.");
    try {
      const record = await this.service.retry(id, requireUser(req), getRequestContext(req));
      sendSuccess(res, { backup: record }, "Backup retried");
    } catch (err) {
      mapError(err);
    }
  });

  /** POST /backup/restore/preview - فحص ملف مرفوع بلا كتابة (raw body) */
  restorePreview: RequestHandler = asyncHandler(async (req, res) => {
    const buffer = requireRawBody(req);
    const preview = this.service.restorePreview(buffer);
    sendSuccess(res, { preview });
  });

  /** POST /backup/restore - استعادة فعلية (raw body للملف + رؤوس التأكيد) */
  restore: RequestHandler = asyncHandler(async (req, res) => {
    const parsed = restoreConfirmSchema.safeParse({
      confirm: req.header("x-restore-confirm") === "true",
      expectedChecksum: req.header("x-expected-checksum") || undefined,
    });
    if (!parsed.success) {
      throw new ApiError(400, "الاستعادة تتطلّب تأكيداً صريحاً قبل التنفيذ.");
    }
    const buffer = requireRawBody(req);
    try {
      const result = await this.service.restore(
        buffer,
        requireUser(req),
        getRequestContext(req),
        parsed.data.expectedChecksum,
      );
      sendSuccess(res, { result }, "Backup restored successfully");
    } catch (err) {
      mapError(err);
    }
  });

  /** GET /backup/statistics */
  statistics: RequestHandler = asyncHandler(async (_req, res) => {
    const statistics = await this.service.getStatistics();
    sendSuccess(res, { statistics });
  });

  /** GET /backup/health */
  health: RequestHandler = asyncHandler(async (_req, res) => {
    const health = await this.service.getHealth();
    sendSuccess(res, { health });
  });

  /** GET /backup/settings */
  getSettings: RequestHandler = asyncHandler(async (_req, res) => {
    const settings = await this.service.getSettings();
    sendSuccess(res, { settings });
  });

  /** PUT /backup/settings */
  updateSettings: RequestHandler = asyncHandler(async (req, res) => {
    const input = updateBackupSettingsSchema.parse(req.body);
    const settings = await this.service.updateSettings(
      input,
      requireUser(req),
      getRequestContext(req),
    );
    sendSuccess(res, { settings }, "Backup settings updated");
  });
}

/** يستخرج جسم الطلب الخام (Buffer) من express.raw المُطبَّق على مسارات الاستعادة */
function requireRawBody(req: Request): Buffer {
  const body: unknown = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new ApiError(400, "ملف النسخة الاحتياطية مفقود أو فارغ.");
  }
  return body;
}
