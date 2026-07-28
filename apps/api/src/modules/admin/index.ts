import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { AdminController } from "./admin.controller.js";
import { AdminRepository } from "./admin.repository.js";
import { createAdminRouter } from "./admin.routes.js";
import { AdminService } from "./admin.service.js";

/** Composition Root لوحدة الإدارة/الأمان (مركز أمان + سجل دخول + جلسات + مصفوفة صلاحيات) */
export function buildAdminModule(): Router {
  const repository = new AdminRepository(prisma);
  const service = new AdminService(repository);
  const controller = new AdminController(service);
  return createAdminRouter(controller);
}

export { AdminService } from "./admin.service.js";
