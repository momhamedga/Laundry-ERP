import type { Express } from "express";
import jwt from "jsonwebtoken";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import {
  api,
  bearer,
  createUser,
  login,
  makeApp,
  resetRateLimiters,
  seedAndLogin,
  TEST_PASSWORD,
} from "./setup/harness.js";

const ISSUER = "laundry-erp-api";
const AUDIENCE = "laundry-erp-clients";

function craftToken(sub: string, opts: { secret?: string; issuer?: string; audience?: string; expiresIn?: number } = {}) {
  return jwt.sign({ role: "ADMIN" }, opts.secret ?? process.env.JWT_ACCESS_SECRET!, {
    subject: sub,
    issuer: opts.issuer ?? ISSUER,
    audience: opts.audience ?? AUDIENCE,
    expiresIn: opts.expiresIn ?? 900,
  });
}

describe("auth (integration)", () => {
  let app: Express;
  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ==================== Login ====================
  describe("POST /login", () => {
    it("valid credentials → 200 + access token + refresh cookie", async () => {
      await createUser({ email: "admin@test.local", role: "ADMIN" });
      const res = await api(app).post("/api/v1/auth/login").send({ email: "admin@test.local", password: TEST_PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.email).toBe("admin@test.local");
      const cookie = res.headers["set-cookie"];
      expect(String(cookie)).toContain("refresh_token=");
      expect(String(cookie)).toContain("HttpOnly");
    });

    it("wrong password → 401 (and does not leak which field)", async () => {
      await createUser({ email: "u@test.local", role: "CASHIER" });
      const res = await api(app).post("/api/v1/auth/login").send({ email: "u@test.local", password: "WrongPass1" });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("البريد الإلكتروني أو كلمة السر غير صحيحة.");
    });

    it("unknown email → 401 (same message as wrong password)", async () => {
      const res = await api(app).post("/api/v1/auth/login").send({ email: "ghost@test.local", password: "WhateverPass1" });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("البريد الإلكتروني أو كلمة السر غير صحيحة.");
    });

    it("inactive account → 403", async () => {
      await createUser({ email: "off@test.local", role: "CASHIER", isActive: false });
      const res = await api(app).post("/api/v1/auth/login").send({ email: "off@test.local", password: TEST_PASSWORD });
      expect(res.status).toBe(403);
    });

    it("malformed body → 400 validation error", async () => {
      const res = await api(app).post("/api/v1/auth/login").send({ email: "not-an-email" });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("locks the account after 5 failed attempts → 423", async () => {
      await createUser({ email: "lock@test.local", role: "CASHIER" });
      for (let i = 0; i < 5; i++) {
        await api(app).post("/api/v1/auth/login").send({ email: "lock@test.local", password: "BadPass123" });
      }
      // الحساب الآن مقفول - حتى كلمة السر الصحيحة تُرفض بـ423
      const res = await api(app).post("/api/v1/auth/login").send({ email: "lock@test.local", password: TEST_PASSWORD });
      expect(res.status).toBe(423);
      const locked = await prisma.user.findUnique({ where: { email: "lock@test.local" } });
      expect(locked?.lockedUntil).toBeTruthy();
    });

    it("rate-limits after 10 attempts per IP → 429", async () => {
      // بريد مجهول: 401 دائماً بلا قفل حساب، فيقيس حدّ المعدّل نقيّاً
      let last = 0;
      for (let i = 0; i < 11; i++) {
        const res = await api(app).post("/api/v1/auth/login").send({ email: "nobody@test.local", password: "SomePass123" });
        last = res.status;
      }
      expect(last).toBe(429);
    });
  });

  // ==================== /me + JWT ====================
  describe("GET /me + JWT verification", () => {
    it("valid token → 200 returns current user", async () => {
      const { accessToken, user } = await seedAndLogin(app, "MANAGER", "me");
      const res = await api(app).get("/api/v1/auth/me").set(bearer(accessToken));
      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(user.id);
    });

    it("missing token → 401", async () => {
      const res = await api(app).get("/api/v1/auth/me");
      expect(res.status).toBe(401);
    });

    it("garbage token → 401", async () => {
      const res = await api(app).get("/api/v1/auth/me").set(bearer("not.a.jwt"));
      expect(res.status).toBe(401);
    });

    it("expired token → 401", async () => {
      const u = await createUser({ email: "exp@test.local", role: "ADMIN" });
      const token = craftToken(u.id, { expiresIn: -10 });
      const res = await api(app).get("/api/v1/auth/me").set(bearer(token));
      expect(res.status).toBe(401);
    });

    it("token signed with wrong secret → 401", async () => {
      const u = await createUser({ email: "ws@test.local", role: "ADMIN" });
      const token = craftToken(u.id, { secret: "a-completely-different-secret-32-characters" });
      const res = await api(app).get("/api/v1/auth/me").set(bearer(token));
      expect(res.status).toBe(401);
    });

    it("token with wrong audience → 401", async () => {
      const u = await createUser({ email: "wa@test.local", role: "ADMIN" });
      const token = craftToken(u.id, { audience: "someone-else" });
      const res = await api(app).get("/api/v1/auth/me").set(bearer(token));
      expect(res.status).toBe(401);
    });

    it("token for a since-deleted user → 401", async () => {
      const u = await createUser({ email: "gone@test.local", role: "ADMIN" });
      const token = craftToken(u.id);
      await prisma.user.delete({ where: { id: u.id } });
      const res = await api(app).get("/api/v1/auth/me").set(bearer(token));
      expect(res.status).toBe(401);
    });
  });

  // ==================== Refresh rotation + reuse detection ====================
  describe("POST /refresh (rotation + reuse detection)", () => {
    it("rotates the refresh cookie and issues a new access token", async () => {
      await createUser({ email: "rot@test.local", role: "ADMIN" });
      const first = await login(app, "rot@test.local");
      const res = await api(app).post("/api/v1/auth/refresh").set("Cookie", first.cookie);
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(String(res.headers["set-cookie"])).toContain("refresh_token=");
    });

    it("reusing a rotated (old) cookie → 401 and revokes all sessions", async () => {
      await createUser({ email: "reuse@test.local", role: "ADMIN" });
      const first = await login(app, "reuse@test.local");
      // دوران واحد يُبطل الكوكي الأول
      await api(app).post("/api/v1/auth/refresh").set("Cookie", first.cookie);
      // إعادة استخدام الكوكي الأول المُبطل = كشف سرقة
      const reuse = await api(app).post("/api/v1/auth/refresh").set("Cookie", first.cookie);
      expect(reuse.status).toBe(401);
      const active = await prisma.refreshToken.count({ where: { revokedAt: null } });
      expect(active).toBe(0);
    });

    it("missing refresh cookie → 401", async () => {
      const res = await api(app).post("/api/v1/auth/refresh");
      expect(res.status).toBe(401);
    });
  });

  // ==================== Logout ====================
  it("POST /logout revokes the session (subsequent refresh → 401)", async () => {
    await createUser({ email: "lo@test.local", role: "ADMIN" });
    const { cookie } = await login(app, "lo@test.local");
    const out = await api(app).post("/api/v1/auth/logout").set("Cookie", cookie);
    expect(out.status).toBe(200);
    const after = await api(app).post("/api/v1/auth/refresh").set("Cookie", cookie);
    expect(after.status).toBe(401);
  });

  // ==================== Change password ====================
  it("POST /change-password updates hash, revokes sessions, and rejects the old password", async () => {
    await createUser({ email: "cp@test.local", role: "ADMIN" });
    const { accessToken, cookie } = await login(app, "cp@test.local");
    const changed = await api(app)
      .post("/api/v1/auth/change-password")
      .set(bearer(accessToken))
      .send({ currentPassword: TEST_PASSWORD, newPassword: "BrandNew1Pass" });
    expect(changed.status).toBe(200);

    // الجلسات القديمة أُبطلت
    const refresh = await api(app).post("/api/v1/auth/refresh").set("Cookie", cookie);
    expect(refresh.status).toBe(401);

    // كلمة السر القديمة تفشل، الجديدة تنجح
    const oldLogin = await api(app).post("/api/v1/auth/login").send({ email: "cp@test.local", password: TEST_PASSWORD });
    expect(oldLogin.status).toBe(401);
    const newLogin = await api(app).post("/api/v1/auth/login").send({ email: "cp@test.local", password: "BrandNew1Pass" });
    expect(newLogin.status).toBe(200);
  });

  // ==================== Forgot / reset password ====================
  describe("forgot/reset password", () => {
    it("forgot-password returns a unified 200 for unknown email (no enumeration)", async () => {
      const res = await api(app).post("/api/v1/auth/forgot-password").send({ email: "unknown@test.local" });
      expect(res.status).toBe(200);
    });

    it("forgot-password stores a reset token hash for a known user", async () => {
      const u = await createUser({ email: "fp@test.local", role: "ADMIN" });
      const res = await api(app).post("/api/v1/auth/forgot-password").send({ email: "fp@test.local" });
      expect(res.status).toBe(200);
      const after = await prisma.user.findUnique({ where: { id: u.id } });
      expect(after?.resetTokenHash).toBeTruthy();
    });

    it("reset-password with an invalid token → 400", async () => {
      const res = await api(app)
        .post("/api/v1/auth/reset-password")
        .send({ token: "x".repeat(40), newPassword: "Another1Pass" });
      expect(res.status).toBe(400);
    });
  });

  // ==================== RBAC + per-user permission overrides ====================
  describe("RBAC + permission overrides (live effective permissions)", () => {
    it("CASHIER lacks users:read → 403 on GET /users", async () => {
      const { accessToken } = await seedAndLogin(app, "CASHIER", "rbac");
      const res = await api(app).get("/api/v1/users").set(bearer(accessToken));
      expect(res.status).toBe(403);
    });

    it("granting users:read via override → 200 (effective permissions recomputed per request)", async () => {
      const { user, accessToken } = await seedAndLogin(app, "CASHIER", "grant");
      await prisma.userPermissionOverride.create({
        data: { userId: user.id, permission: "users:read", granted: true },
      });
      const res = await api(app).get("/api/v1/users").set(bearer(accessToken));
      expect(res.status).toBe(200);
    });

    it("revoking users:read from an ADMIN via override → 403", async () => {
      const { user, accessToken } = await seedAndLogin(app, "ADMIN", "revoke");
      await prisma.userPermissionOverride.create({
        data: { userId: user.id, permission: "users:read", granted: false },
      });
      const res = await api(app).get("/api/v1/users").set(bearer(accessToken));
      expect(res.status).toBe(403);
    });

    it("ADMIN can list users → 200", async () => {
      const { accessToken } = await seedAndLogin(app, "ADMIN", "adminlist");
      const res = await api(app).get("/api/v1/users").set(bearer(accessToken));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
