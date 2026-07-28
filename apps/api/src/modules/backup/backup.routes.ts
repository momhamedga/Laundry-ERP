import express, { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { MAX_RESTORE_UPLOAD_BYTES } from "./backup.constants.js";
import type { BackupController } from "./backup.controller.js";

/**
 * مسارات النسخ الاحتياطي - /api/v1/backup
 *
 * التوافقية: GET / يبقى على settings:manage (عقده الأصلي بلا تغيير). المسارات
 * الجديدة تستخدم صلاحيات backup:* الجديدة (ADMIN يملكها تلقائياً - لا كسر لأحد).
 *
 * رفع ملف الاستعادة: express.raw مقصور على مساري الاستعادة بنوع محتوى مخصّص
 * (application/octet-stream) حتى لا يعترضه express.json العام (حد 1MB) - بلا لمس app.ts.
 */
export function createBackupRouter(controller: BackupController): Router {
  const router = Router();
  const rawUpload = express.raw({
    type: () => true,
    limit: MAX_RESTORE_UPLOAD_BYTES,
  });

  router.use(authenticate);

  // ---- الأصلي (بلا تغيير) ----
  router.get("/", requirePermission("settings:manage"), controller.download);

  // ---- إنشاء نسخة مُخزَّنة ----
  router.post("/", requirePermission("backup:create"), controller.create);

  // ---- History ----
  router.get("/history", requirePermission("backup:read"), controller.history);
  router.get("/history/:id/download", requirePermission("backup:read"), controller.downloadStored);
  router.delete("/history/:id", requirePermission("backup:manage"), controller.remove);
  router.delete("/history", requirePermission("backup:manage"), controller.cleanup);

  // ---- Retry ----
  router.post("/retry/:id", requirePermission("backup:create"), controller.retry);

  // ---- Restore (raw upload) ----
  router.post(
    "/restore/preview",
    requirePermission("backup:restore"),
    rawUpload,
    controller.restorePreview,
  );
  router.post("/restore", requirePermission("backup:restore"), rawUpload, controller.restore);

  // ---- Statistics / Health ----
  router.get("/statistics", requirePermission("backup:read"), controller.statistics);
  router.get("/health", requirePermission("backup:read"), controller.health);

  // ---- Settings ----
  router.get("/settings", requirePermission("backup:manage"), controller.getSettings);
  router.put("/settings", requirePermission("backup:manage"), controller.updateSettings);

  return router;
}
