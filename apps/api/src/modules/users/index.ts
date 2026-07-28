import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { UsersController } from "./users.controller.js";
import { UsersRepository } from "./users.repository.js";
import { createUsersRouter } from "./users.routes.js";
import { UsersService } from "./users.service.js";

/**
 * Composition Root للـ Users Module
 * Dependency Injection يدوي: Repository → Service → Controller → Router
 */
export function buildUsersModule(): Router {
  const repository = new UsersRepository(prisma);
  const service = new UsersService(repository);
  const controller = new UsersController(service);
  return createUsersRouter(controller);
}

// الواجهة العامة للـ Module
export { UsersService } from "./users.service.js";
export { UsersRepository } from "./users.repository.js";
export type { PaginationMeta, UserDetails, ActivityEntry } from "./users.types.js";
