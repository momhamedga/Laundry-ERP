import type { RequestHandler, Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { DayClosingController } from "./day-closing.controller.js";
import { createPeriodLockMiddleware } from "./day-closing.middleware.js";
import { DayClosingRepository } from "./day-closing.repository.js";
import { createDayClosingRouter } from "./day-closing.routes.js";
import { DayClosingService } from "./day-closing.service.js";

/**
 * Composition Root لوحدة إغلاق اليوم. الخدمة مفردة تُشارك بين الراوتر و
 * middleware قفل الفترة (كلاهما يحتاج نفس المنطق - لا تكرار حالة).
 */
const dayClosingService = new DayClosingService(new DayClosingRepository(prisma));

export function buildDayClosingModule(): Router {
  const controller = new DayClosingController(dayClosingService);
  return createDayClosingRouter(controller);
}

/** middleware قفل الفترة المحاسبية - يُركَّب عاماً في app.ts قبل مسارات المعاملات */
export function buildPeriodLockMiddleware(): RequestHandler {
  return createPeriodLockMiddleware(dayClosingService);
}

export { DayClosingService } from "./day-closing.service.js";
