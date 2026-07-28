import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { InventoryRepository, InventoryService } from "../inventory/index.js";
import { PurchasesController } from "./purchases.controller.js";
import { PurchasesRepository } from "./purchases.repository.js";
import { createPurchasesRouter } from "./purchases.routes.js";
import { PurchasesService } from "./purchases.service.js";

/**
 * Composition Root لوحدة المشتريات.
 * تُعيد استخدام InventoryService (محرك التنبيهات) بلا تكرار - نسخة عديمة الحالة
 * تُبنى هنا للاستلام (refreshAlerts فقط).
 */
export function buildPurchasesModule(): Router {
  const repository = new PurchasesRepository(prisma);
  const inventoryService = new InventoryService(new InventoryRepository(prisma));
  const service = new PurchasesService(repository, inventoryService);
  const controller = new PurchasesController(service);
  return createPurchasesRouter(controller);
}
