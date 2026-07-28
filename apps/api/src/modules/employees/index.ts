import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { EmployeesController } from "./employees.controller.js";
import { EmployeesRepository } from "./employees.repository.js";
import { createEmployeesRouter } from "./employees.routes.js";
import { EmployeesService } from "./employees.service.js";

/** Composition Root لوحدة الموظفين (ملفات HR إضافية 1-1 مع User) */
export function buildEmployeesModule(): Router {
  const repository = new EmployeesRepository(prisma);
  const service = new EmployeesService(repository);
  const controller = new EmployeesController(service);
  return createEmployeesRouter(controller);
}

export { EmployeesService } from "./employees.service.js";
