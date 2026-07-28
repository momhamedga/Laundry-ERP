import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { CouponsController } from "./coupons.controller.js";
import { CouponsRepository } from "./coupons.repository.js";
import { createCouponsRouter } from "./coupons.routes.js";
import { CouponsService } from "./coupons.service.js";

/** خدمة مفردة - يستخدمها تكامل الولاء لاستعادة الكوبون عند إلغاء/استرداد الطلب */
export const couponsService = new CouponsService(new CouponsRepository(prisma));

/** Composition Root لوحدة الكوبونات */
export function buildCouponsModule(): Router {
  const controller = new CouponsController(couponsService);
  return createCouponsRouter(controller);
}

export { CouponsService } from "./coupons.service.js";
