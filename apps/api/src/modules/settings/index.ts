import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { SettingsController } from "./settings.controller.js";
import { SettingsRepository } from "./settings.repository.js";
import { createSettingsRouter } from "./settings.routes.js";
import { SettingsService } from "./settings.service.js";

/**
 * Composition Root للـ Settings Module
 */
export function buildSettingsModule(): Router {
  const repository = new SettingsRepository(prisma);
  const service = new SettingsService(repository);
  const controller = new SettingsController(service);
  return createSettingsRouter(controller);
}

// الواجهة العامة للـ Module
export { SettingsService } from "./settings.service.js";
export { SettingsRepository } from "./settings.repository.js";
export type { SettingsResponse } from "./settings.types.js";
