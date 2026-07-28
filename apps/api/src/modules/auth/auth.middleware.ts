import { rateLimit } from "express-rate-limit";

/**
 * Rate Limiters خاصة بمسارات المصادقة - Brute Force Protection طبقة أولى
 * (طبقة ثانية: Account Lock في auth.service بعد MAX_FAILED_LOGIN_ATTEMPTS)
 */

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/** حد صارم لمحاولات الدخول لكل IP */
export const loginRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Try again later" },
});

/** حد لطلبات استعادة كلمة السر - يمنع إغراق البريد */
export const passwordResetRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many reset requests. Try again later" },
});

/** حد عام لبقية مسارات المصادقة (refresh/logout...) */
export const authRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Try again later" },
});
