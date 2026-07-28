import { Router } from "express";
import { prisma } from "../lib/prisma.js";

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
    version: "0.1.0",
    database,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
