import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { ServicesController } from "./services.controller.js";
import { ServicesRepository } from "./services.repository.js";
import { createServicesRouter } from "./services.routes.js";
import { ServicesService } from "./services.service.js";

/**
 * Composition Root للـ Services Module
 * Dependency Injection يدوي: Repository → Service → Controller → Router
 */
export function buildServicesModule(): Router {
  const repository = new ServicesRepository(prisma);
  const service = new ServicesService(repository);
  const controller = new ServicesController(service);
  return createServicesRouter(controller);
}

// الواجهة العامة للـ Module
export { ServicesService } from "./services.service.js";
export { ServicesRepository } from "./services.repository.js";
export type { ServiceWithCategory } from "./services.types.js";
