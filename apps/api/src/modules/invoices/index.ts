import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { buildEmailService } from "../email/index.js";
import { PaymentsRepository } from "../payments/index.js";
import { SettingsRepository } from "../settings/index.js";
import { InvoicesController } from "./invoice.controller.js";
import { InvoicesRepository } from "./invoice.repository.js";
import { createInvoicesRouter } from "./invoice.routes.js";
import { InvoicesService } from "./invoice.service.js";

/**
 * Composition Root لوحدة الفواتير
 * Dependency Injection يدوي: Repository → Service → Controller → Router
 * SettingsRepository (بيانات الشركة لمستند PDF)، EmailService (إرسال حقيقي)،
 * وPaymentsRepository (تكامل المدفوعات: قراءة صافي المحصَّل + قائمة المدفوعات)
 * يُعاد استخدامها مباشرة من وحداتها - بلا تكرار منطق أيٍّ منها هنا
 */
export function buildInvoicesModule(): Router {
  const repository = new InvoicesRepository(prisma);
  const settingsRepository = new SettingsRepository(prisma);
  const emailService = buildEmailService();
  const paymentsRepository = new PaymentsRepository(prisma);
  const service = new InvoicesService(
    repository,
    settingsRepository,
    emailService,
    paymentsRepository,
  );
  const controller = new InvoicesController(service);
  return createInvoicesRouter(controller);
}

// الواجهة العامة للـ Module
export { InvoicesService } from "./invoice.service.js";
export { InvoicesRepository } from "./invoice.repository.js";
export type { InvoiceDetail, InvoiceListRow } from "./invoice.types.js";
