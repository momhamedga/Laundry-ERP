import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { CustomersController } from "./customers.controller.js";
import { CustomersRepository } from "./customers.repository.js";
import { createCustomersRouter } from "./customers.routes.js";
import { CustomersService } from "./customers.service.js";

/**
 * Composition Root للـ Customers Module
 * Dependency Injection يدوي: Repository → Service → Controller → Router
 */
export function buildCustomersModule(): Router {
  const repository = new CustomersRepository(prisma);
  const service = new CustomersService(repository);
  const controller = new CustomersController(service);
  return createCustomersRouter(controller);
}

// الواجهة العامة للـ Module
export { CustomersService } from "./customers.service.js";
export { CustomersRepository } from "./customers.repository.js";
export type {
  CustomerProfile,
  CustomerStats,
  RecentOrder,
} from "./customers.types.js";
