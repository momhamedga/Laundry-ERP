import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import type { AuthController } from "./auth.controller.js";
import {
  authRateLimiter,
  loginRateLimiter,
  passwordResetRateLimiter,
} from "./auth.middleware.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  revokeSessionSchema,
  validateBody,
} from "./auth.validator.js";

/**
 * مسارات المصادقة - /api/v1/auth
 * الـ controller يُحقن من composition root (index.ts)
 */
export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  // Public
  router.post("/login", loginRateLimiter, validateBody(loginSchema), controller.login);
  router.post("/refresh", authRateLimiter, controller.refresh);
  router.post("/logout", authRateLimiter, controller.logout);
  router.post(
    "/forgot-password",
    passwordResetRateLimiter,
    validateBody(forgotPasswordSchema),
    controller.forgotPassword,
  );
  router.post(
    "/reset-password",
    passwordResetRateLimiter,
    validateBody(resetPasswordSchema),
    controller.resetPassword,
  );

  // Protected
  router.get("/me", authenticate, controller.me);
  router.post(
    "/change-password",
    authenticate,
    validateBody(changePasswordSchema),
    controller.changePassword,
  );
  router.get("/sessions", authenticate, controller.listSessions);
  router.delete(
    "/sessions",
    authenticate,
    validateBody(revokeSessionSchema),
    controller.revokeSession,
  );

  return router;
}
