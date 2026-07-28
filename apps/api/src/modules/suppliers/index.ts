import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { SuppliersController } from "./suppliers.controller.js";
import { SuppliersRepository } from "./suppliers.repository.js";
import { createSuppliersRouter } from "./suppliers.routes.js";
import { SuppliersService } from "./suppliers.service.js";

/** Composition Root لوحدة الموردين */
export function buildSuppliersModule(): Router {
  const repository = new SuppliersRepository(prisma);
  const service = new SuppliersService(repository);
  const controller = new SuppliersController(service);
  return createSuppliersRouter(controller);
}

export { SuppliersRepository } from "./suppliers.repository.js";
export { SuppliersService } from "./suppliers.service.js";
