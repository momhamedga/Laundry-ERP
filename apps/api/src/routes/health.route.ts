import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { readApplicationVersion } from "../modules/backup/backup.utils.js";

/**
 * الإصدار من package.json لا رقماً مكتوباً هنا.
 *
 * كان مكتوباً "0.1.0" يدوياً، فبقي كذلك بعد ترقية المشروع إلى 2.1.6 بينما
 * تعرف بقية أجزاء الخادم الرقم الصحيح. ونقطة /health هي أول ما يُسأل عند
 * التحقيق في عطل إنتاج — أن تكذب في أي حقل يجعل التحقيق يبدأ من معلومة خاطئة.
 */
const APPLICATION_VERSION = readApplicationVersion();

export const healthRouter = Router();

/**
 * GET /api/v1/health
 * فحص حالة الخادم وقاعدة البيانات
 */
healthRouter.get("/", async (_req, res) => {
  let database: "connected" | "disconnected" = "disconnected";

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch {
    // قاعدة البيانات غير متاحة - الخادم يبقى يستجيب
  }

  res.status(database === "connected" ? 200 : 503).json({
    success: true,
    service: "laundry-erp-api",
    version: APPLICATION_VERSION,
    database,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
