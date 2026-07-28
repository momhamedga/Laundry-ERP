import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { CategoryController } from "./category.controller.js";
import { CategoryRepository } from "./category.repository.js";
import { createCategoryRouter } from "./category.routes.js";
import { CategoryService } from "./category.service.js";

/**
 * Composition Root للـ Service Categories Module
 * Dependency Injection يدوي: Repository → Service → Controller → Router
 */
export function buildCategoryModule(): Router {
  const repository = new CategoryRepository(prisma);
  const service = new CategoryService(repository);
  const controller = new CategoryController(service);
  return createCategoryRouter(controller);
}

// الواجهة العامة للـ Module
export { CategoryService } from "./category.service.js";
export { CategoryRepository } from "./category.repository.js";
export type { CategoryWithCount } from "./category.types.js";
