import type { Express } from "express";
import jwt from "jsonwebtoken";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { api, bearer, createUser, login, makeApp, resetRateLimiters, seedAndLogin, TEST_PASSWORD } from "./setup/harness.js";

describe("admin: security + overrides + impersonation (integration)", () => {
  let app: Express;
  let adminToken: string;
  let adminId: string;

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    const admin = await seedAndLogin(app, "ADMIN", "adm");
    adminToken = admin.accessToken;
    adminId = admin.user.id;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("security center RBAC", () => {
    it("ADMIN reaches the security center; CASHIER is forbidden (403)", async () => {
      const ok = await api(app).get("/api/v1/admin/security-center").set(bearer(adminToken));
      expect(ok.status).toBe(200);
      const cashier = await seedAndLogin(app, "CASHIER", "adm");
      const denied = await api(app).get("/api/v1/admin/security-center").set(bearer(cashier.accessToken));
      expect(denied.status).toBe(403);
    });

    it("exposes the permission matrix and login history", async () => {
      const matrix = await api(app).get("/api/v1/admin/permissions-matrix").set(bearer(adminToken));
      expect(matrix.status).toBe(200);
      const history = await api(app).get("/api/v1/admin/login-history").set(bearer(adminToken));
      expect(history.status).toBe(200);
    });

    it("MANAGER (security:view) can read the matrix but cannot set an override (403)", async () => {
      const mgr = await seedAndLogin(app, "MANAGER", "adm");
      const read = await api(app).get("/api/v1/admin/permissions-matrix").set(bearer(mgr.accessToken));
      expect(read.status).toBe(200);
      const cashier = await createUser({ email: "target1@test.local", role: "CASHIER" });
      const write = await api(app)
        .put(`/api/v1/admin/users/${cashier.id}/permissions`)
        .set(bearer(mgr.accessToken))
        .send({ permission: "users:read", granted: true });
      expect(write.status).toBe(403);
    });
  });

  describe("per-user permission overrides (end-to-end effect)", () => {
    it("granting then removing users:read flips a CASHIER's access to /users", async () => {
      const cashier = await createUser({ email: "target2@test.local", role: "CASHIER" });
      const cashierAuth = await login(app, "target2@test.local");

      // قبل التجاوز: ممنوع
      const before = await api(app).get("/api/v1/users").set(bearer(cashierAuth.accessToken));
      expect(before.status).toBe(403);

      // منح التجاوز عبر الأدمن
      const grant = await api(app)
        .put(`/api/v1/admin/users/${cashier.id}/permissions`)
        .set(bearer(adminToken))
        .send({ permission: "users:read", granted: true });
      expect(grant.status).toBe(200);

      const after = await api(app).get("/api/v1/users").set(bearer(cashierAuth.accessToken));
      expect(after.status).toBe(200);

      // إزالة التجاوز يعيد المنع
      const remove = await api(app)
        .delete(`/api/v1/admin/users/${cashier.id}/permissions`)
        .set(bearer(adminToken))
        .send({ permission: "users:read" });
      expect(remove.status).toBe(200);
      const afterRemove = await api(app).get("/api/v1/users").set(bearer(cashierAuth.accessToken));
      expect(afterRemove.status).toBe(403);
    });
  });

  describe("impersonation", () => {
    it("issues a scoped token that acts as the target and carries the imp claim", async () => {
      const target = await createUser({ email: "impersonated@test.local", role: "MANAGER" });
      const res = await api(app).post(`/api/v1/admin/impersonate/${target.id}`).set(bearer(adminToken)).send({});
      expect(res.status).toBe(200);
      const impToken = res.body.data.accessToken;
      expect(impToken).toBeTruthy();

      // الهوية الفعلية = المستخدم الهدف
      const me = await api(app).get("/api/v1/auth/me").set(bearer(impToken));
      expect(me.status).toBe(200);
      expect(me.body.data.user.id).toBe(target.id);

      // التوكين يحمل ادعاء الانتحال imp = معرّف الأدمن
      const decoded = jwt.decode(impToken) as { imp?: string; sub?: string };
      expect(decoded.imp).toBe(adminId);
      expect(decoded.sub).toBe(target.id);
    });

    it("forbids a non-admin from impersonating (403)", async () => {
      const cashier = await seedAndLogin(app, "CASHIER", "adm");
      const target = await createUser({ email: "victim@test.local", role: "WORKER" });
      const res = await api(app).post(`/api/v1/admin/impersonate/${target.id}`).set(bearer(cashier.accessToken)).send({});
      expect(res.status).toBe(403);
    });
  });

  describe("session management / force logout", () => {
    it("ADMIN can list a user's sessions and kill one (force logout)", async () => {
      const user = await createUser({ email: "sessO@test.local", role: "MANAGER" });
      const userAuth = await login(app, "sessO@test.local");

      const sessions = await api(app).get(`/api/v1/admin/users/${user.id}/sessions`).set(bearer(adminToken));
      expect(sessions.status).toBe(200);
      const sessionId = sessions.body.data.sessions[0].id;
      expect(sessionId).toBeTruthy();

      const kill = await api(app).delete(`/api/v1/admin/sessions/${sessionId}`).set(bearer(adminToken));
      expect([200, 204]).toContain(kill.status);

      // بعد الإخراج القسري، لم يعد بإمكان المستخدم تجديد جلسته
      const refresh = await api(app).post("/api/v1/auth/refresh").set("Cookie", userAuth.cookie);
      expect(refresh.status).toBe(401);
    });
  });
});
