import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { BranchesController } from "./branches.controller.js";
import { BranchesRepository } from "./branches.repository.js";
import { createBranchesRouter } from "./branches.routes.js";
import { BranchesService } from "./branches.service.js";

/**
 * Composition Root للـ Branches Module
 */
export function buildBranchesModule(): Router {
  const repository = new BranchesRepository(prisma);
  const service = new BranchesService(repository);
  const controller = new BranchesController(service);
  return createBranchesRouter(controller);
}

// الواجهة العامة للـ Module
export { BranchesService } from "./branches.service.js";
export { BranchesRepository } from "./branches.repository.js";
export type { BranchWithCounts } from "./branches.types.js";
