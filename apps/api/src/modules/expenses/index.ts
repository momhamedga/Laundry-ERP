import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { ExpensesController } from "./expenses.controller.js";
import { ExpensesRepository } from "./expenses.repository.js";
import { createExpensesRouter } from "./expenses.routes.js";
import { ExpensesService } from "./expenses.service.js";

/** Composition Root لوحدة المصروفات - نفس نمط بقية الوحدات */
export function buildExpensesModule(): Router {
  const repository = new ExpensesRepository(prisma);
  const service = new ExpensesService(repository);
  const controller = new ExpensesController(service);
  return createExpensesRouter(controller);
}

export { ExpensesRepository } from "./expenses.repository.js";
export { ExpensesService } from "./expenses.service.js";
export type { ExpenseRow, ListExpensesResult, OperatingSummary } from "./expenses.types.js";
