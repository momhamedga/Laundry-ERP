import type { UserRole } from "@prisma/client";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { hashPassword } from "../../src/lib/bcrypt.js";
import {
  authRateLimiter,
  loginRateLimiter,
  passwordResetRateLimiter,
} from "../../src/modules/auth/auth.middleware.js";
import { prisma } from "./db.js";

/** كلمة مرور اختبار موحّدة (تحقّق سياسة كلمة السر خارج نطاق الإدخال المباشر) */
export const TEST_PASSWORD = "Passw0rd!23";

/**
 * تطبيق Express جديد لكل سويت - يعيد ضبط مخازن Rate-Limit داخل الذاكرة (كل نداء
 * createApp يبني limiters جديدة)، فلا تتسرّب حدود المعدّل بين السويتات.
 */
export function makeApp(): Express {
  return createApp();
}

export function api(app: Express) {
  return request(app);
}

export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/**
 * مُحدِّدات المعدّل (auth) ثوابت على مستوى الوحدة، فمخزنها يُشارَك عبر كل نداءات
 * createApp داخل نفس العملية (سلوك إنتاجي حقيقي). نُصفّره بين الاختبارات بمسح
 * مفتاح localhost - req.ip يُطبَّع إلى "127.0.0.1" (أو "::" لـ::1) عبر ipKeyGenerator.
 */
const LOCALHOST_KEYS = ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::"];
export async function resetRateLimiters(): Promise<void> {
  const limiters = [loginRateLimiter, authRateLimiter, passwordResetRateLimiter] as unknown as {
    resetKey: (key: string) => void | Promise<void>;
  }[];
  for (const limiter of limiters) {
    for (const key of LOCALHOST_KEYS) {
      await limiter.resetKey(key);
    }
  }
}

interface CreateUserOpts {
  email: string;
  role: UserRole;
  password?: string;
  name?: string;
  isActive?: boolean;
  branchId?: string | null;
}

/** يزرع مستخدماً مباشرةً في قاعدة الاختبار (تجاوز مسار الإنشاء المحمي بالأدمن). */
export async function createUser(opts: CreateUserOpts) {
  const passwordHash = await hashPassword(opts.password ?? TEST_PASSWORD);
  return prisma.user.create({
    data: {
      email: opts.email,
      name: opts.name ?? opts.email,
      role: opts.role,
      passwordHash,
      isActive: opts.isActive ?? true,
      branchId: opts.branchId ?? null,
    },
  });
}

export interface LoggedInUser {
  user: Awaited<ReturnType<typeof createUser>>;
  accessToken: string;
  cookie: string[];
}

/** تسجيل دخول حقيقي عبر HTTP ويعيد الـ access token وكوكي الـ refresh. */
export async function login(
  app: Express,
  email: string,
  password: string = TEST_PASSWORD,
): Promise<{ accessToken: string; cookie: string[] }> {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  const rawCookie = res.headers["set-cookie"];
  const cookie = Array.isArray(rawCookie) ? rawCookie : rawCookie ? [rawCookie] : [];
  return { accessToken: res.body.data.accessToken as string, cookie };
}

/** يزرع مستخدماً بدور مُحدّد ويسجّل دخوله - أساس كل الاختبارات المحمية. */
export async function seedAndLogin(
  app: Express,
  role: UserRole,
  emailPrefix = "user",
): Promise<LoggedInUser> {
  const email = `${emailPrefix}.${role.toLowerCase()}@test.local`;
  const user = await createUser({ email, role });
  const { accessToken, cookie } = await login(app, email);
  return { user, accessToken, cookie };
}
