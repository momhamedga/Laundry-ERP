import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { buildEmailService } from "../email/index.js";
import { AuthController } from "./auth.controller.js";
import { AuthRepository } from "./auth.repository.js";
import { createAuthRouter } from "./auth.routes.js";
import { AuthService } from "./auth.service.js";

/**
 * Composition Root للـ Auth Module
 * Dependency Injection يدوي: Repository → Service → Controller → Router
 * EmailService يُحقَن هنا (Resend افتراضياً) - استبدال المزود مستقبلاً لا يمسّ
 * هذا الملف ولا AuthService، فقط buildEmailService() نفسها.
 */
export function buildAuthModule(): Router {
  const repository = new AuthRepository(prisma);
  const emailService = buildEmailService();
  const service = new AuthService(repository, emailService);
  const controller = new AuthController(service);
  return createAuthRouter(controller);
}

// الواجهة العامة للـ Module
export { AuthService } from "./auth.service.js";
export { AuthRepository } from "./auth.repository.js";
export type { AuthenticatedUser, SafeUser, RequestContext } from "./auth.types.js";
export { ROLE_PERMISSIONS, PERMISSIONS, type Permission } from "./auth.constants.js";
