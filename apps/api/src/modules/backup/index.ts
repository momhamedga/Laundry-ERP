import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { BackupController } from "./backup.controller.js";
import { BackupRepository } from "./backup.repository.js";
import { createBackupRouter } from "./backup.routes.js";
import { startBackupScheduler as startScheduler } from "./backup.scheduler.js";
import { BackupService } from "./backup.service.js";

/**
 * Composition Root للـ Backup Module.
 * Repository/Service مُفردان على مستوى الوحدة (نفس نمط الإشعارات) حتى يشترك
 * الـ scheduler والـ router بنفس نسخة الخدمة بالضبط.
 */
const backupRepository = new BackupRepository(prisma);
const backupService = new BackupService(backupRepository);

export function buildBackupModule(): Router {
  const controller = new BackupController(backupService);
  return createBackupRouter(controller);
}

/** يُستدعى من server.ts بعد بدء الاستماع - يُعيد دالة إيقاف للإغلاق النظيف */
export function startBackupScheduler(): () => void {
  return startScheduler(backupService);
}

// الواجهة العامة للـ Module
export { BackupService } from "./backup.service.js";
export type { BackupPayload } from "./backup.types.js";
