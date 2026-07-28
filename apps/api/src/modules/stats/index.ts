import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { StatsController } from "./stats.controller.js";
import { StatsRepository } from "./stats.repository.js";
import { createStatsRouter } from "./stats.routes.js";
import { StatsService } from "./stats.service.js";

/**
 * Composition Root للـ Stats Module
 */
export function buildStatsModule(): Router {
  const repository = new StatsRepository(prisma);
  const service = new StatsService(repository);
  const controller = new StatsController(service);
  return createStatsRouter(controller);
}

export { StatsService } from "./stats.service.js";
export type { DashboardStats } from "./stats.types.js";
