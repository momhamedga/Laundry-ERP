import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { membershipService } from "../membership/index.js";
import { LoyaltyController } from "./loyalty.controller.js";
import { registerLoyaltyIntegration } from "./loyalty.integration.js";
import { LoyaltyRepository } from "./loyalty.repository.js";
import { createLoyaltyRouter } from "./loyalty.routes.js";
import { LoyaltyService } from "./loyalty.service.js";

/**
 * Composition Root لوحدة الولاء. الخدمة مفردة (تشترك مع تكامل الـ bus).
 * تُعيد استخدام membershipService المشترك (تقييم المستوى + المزايا).
 */
const loyaltyService = new LoyaltyService(new LoyaltyRepository(prisma), membershipService);

// تسجيل مستمع الـ bus مرة واحدة عند تحميل الوحدة (earn/reverse من دورة الطلب)
registerLoyaltyIntegration(loyaltyService);

export function buildLoyaltyModule(): Router {
  const controller = new LoyaltyController(loyaltyService);
  return createLoyaltyRouter(controller);
}

export { LoyaltyService } from "./loyalty.service.js";
