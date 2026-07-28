import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { SettingsRepository } from "../settings/index.js";
import { PaymentsController } from "./payments.controller.js";
import { PaymentsRepository } from "./payments.repository.js";
import { createPaymentsRouter } from "./payments.routes.js";
import { PaymentsService } from "./payments.service.js";

/**
 * Composition Root للـ Payments Module
 * Dependency Injection يدوي: Repository → Service → Controller → Router
 * SettingsRepository (بيانات الشركة لإيصال الدفع) يُعاد استخدامه من وحدته
 */
export function buildPaymentsModule(): Router {
  const repository = new PaymentsRepository(prisma);
  const settingsRepository = new SettingsRepository(prisma);
  const service = new PaymentsService(repository, settingsRepository);
  const controller = new PaymentsController(service);
  return createPaymentsRouter(controller);
}

// الواجهة العامة للـ Module
export { PaymentsService } from "./payments.service.js";
export { PaymentsRepository, PaymentsTxRepository } from "./payments.repository.js";
export { PAYMENT_INCLUDE } from "./payments.types.js";
export type { PaymentRow } from "./payments.types.js";
