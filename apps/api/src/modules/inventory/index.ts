import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { InventoryController } from "./inventory.controller.js";
import { InventoryRepository } from "./inventory.repository.js";
import { createInventoryRouter } from "./inventory.routes.js";
import { InventoryService } from "./inventory.service.js";

/** Composition Root لوحدة المخزون */
export function buildInventoryModule(): Router {
  const repository = new InventoryRepository(prisma);
  const service = new InventoryService(repository);
  const controller = new InventoryController(service);
  return createInventoryRouter(controller);
}

export { InventoryRepository, applyStockMovement } from "./inventory.repository.js";
export { InventoryService } from "./inventory.service.js";
