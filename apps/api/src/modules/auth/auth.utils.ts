import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { CookieOptions, Request, Response } from "express";
import type { User } from "@prisma/client";
import { env } from "../../config/env.js";
import type { RequestContext, SafeUser } from "./auth.types.js";
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from "./auth.constants.js";

// ==================== Opaque Tokens ====================

/** توليد توكين عشوائي مبهم (Refresh / Reset) */
export function generateOpaqueToken(): string {
  return randomBytes(48).toString("base64url");
}

/**
 * SHA-256 للتخزين - لا يُخزن التوكين الخام أبداً في قاعدة البيانات
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** مقارنة آمنة توقيتياً لسلاسل متساوية الطول المتوقع */
export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// ==================== Request Context ====================

export function getRequestContext(req: Request): RequestContext {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  };
}

// ==================== Refresh Cookie ====================

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

export function readRefreshCookie(req: Request): string | null {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const token = cookies?.[REFRESH_COOKIE_NAME];
  return typeof token === "string" && token.length > 0 ? token : null;
}

// ==================== Sanitization ====================

/** إزالة كل الحقول الحساسة قبل الإرجاع للعميل */
export function toSafeUser(user: User): SafeUser {
  const {
    passwordHash: _passwordHash,
    failedLoginAttempts: _attempts,
    lockedUntil: _locked,
    resetTokenHash: _resetHash,
    resetTokenExpiresAt: _resetExp,
    ...safe
  } = user;
  return safe;
}
