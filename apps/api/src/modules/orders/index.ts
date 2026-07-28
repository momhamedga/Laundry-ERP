import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { OrdersController } from "./orders.controller.js";
import { OrdersRepository } from "./orders.repository.js";
import { createOrdersRouter } from "./orders.routes.js";
import { OrdersService } from "./orders.service.js";

/**
 * Composition Root للـ Orders Module
 * Dependency Injection يدوي: Repository → Service → Controller → Router
 */
export function buildOrdersModule(): Router {
  const repository = new OrdersRepository(prisma);
  const service = new OrdersService(repository);
  const controller = new OrdersController(service);
  return createOrdersRouter(controller);
}

// الواجهة العامة للـ Module
export { OrdersService } from "./orders.service.js";
export { OrdersRepository } from "./orders.repository.js";
export type { OrderDetail, OrderListRow, HistoryEntry } from "./orders.types.js";
export { ORDER_STATUS_FLOW, TERMINAL_STATUSES } from "./orders.constants.js";
