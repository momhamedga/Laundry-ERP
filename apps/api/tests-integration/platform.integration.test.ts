import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { api, bearer, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

/** التقارير (تصدير) + النسخ الاحتياطي - مسارات النظام + RBAC */
describe("platform: reports export + backup (integration)", () => {
  let app: Express;
  let adminToken: string;
  let cashierToken: string;

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    adminToken = (await seedAndLogin(app, "ADMIN", "plt")).accessToken;
    cashierToken = (await seedAndLogin(app, "CASHIER", "plt")).accessToken;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("reports export (reports:view)", () => {
    it("exports an orders report as CSV (200)", async () => {
      const res = await api(app).get("/api/v1/reports/export/csv?type=orders").set(bearer(adminToken));
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/csv/);
    });

    it("exports an orders report as Excel (200)", async () => {
      const res = await api(app).get("/api/v1/reports/export/excel?type=orders").set(bearer(adminToken));
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/spreadsheet|excel|octet-stream/);
    });

    it("rejects an unknown report type (400)", async () => {
      const res = await api(app).get("/api/v1/reports/export/csv?type=bogus").set(bearer(adminToken));
      expect(res.status).toBe(400);
    });

    it("CASHIER has no reports:view → 403", async () => {
      const res = await api(app).get("/api/v1/reports/export/csv?type=orders").set(bearer(cashierToken));
      expect(res.status).toBe(403);
    });
  });

  describe("backup (ADMIN-only)", () => {
    it("ADMIN creates a JSON backup and lists history", async () => {
      const create = await api(app).post("/api/v1/backup").set(bearer(adminToken)).send({});
      expect(create.status).toBe(201);
      expect(create.body.data.backup).toBeTruthy();
      const history = await api(app).get("/api/v1/backup/history").set(bearer(adminToken));
      expect(history.status).toBe(200);
      expect(history.body.data.backups.length).toBeGreaterThanOrEqual(1);
    });

    it("exposes health + statistics to ADMIN", async () => {
      const health = await api(app).get("/api/v1/backup/health").set(bearer(adminToken));
      expect(health.status).toBe(200);
      const stats = await api(app).get("/api/v1/backup/statistics").set(bearer(adminToken));
      expect(stats.status).toBe(200);
    });

    it("CASHIER cannot create a backup (403)", async () => {
      const res = await api(app).post("/api/v1/backup").set(bearer(cashierToken)).send({});
      expect(res.status).toBe(403);
    });
  });
});
