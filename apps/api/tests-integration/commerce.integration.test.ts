import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { createCustomer, uniq } from "./setup/factories.js";
import { api, bearer, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

describe("commerce: coupons + loyalty + membership (integration)", () => {
  let app: Express;
  let adminToken: string;
  let cashierToken: string;

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    adminToken = (await seedAndLogin(app, "ADMIN", "com")).accessToken;
    cashierToken = (await seedAndLogin(app, "CASHIER", "com")).accessToken;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("coupons", () => {
    async function createCoupon(over: { code?: string; value?: number } = {}) {
      const res = await api(app)
        .post("/api/v1/coupons")
        .set(bearer(adminToken))
        .send({ code: over.code ?? `SAVE-${uniq()}`, type: "PERCENTAGE", value: over.value ?? 10 });
      return res;
    }

    it("creates a coupon (201)", async () => {
      const res = await createCoupon({ value: 15 });
      expect(res.status).toBe(201);
      expect(Number(res.body.data.coupon.value)).toBe(15);
    });

    it("rejects a duplicate code (409)", async () => {
      const code = `DUP-${uniq()}`;
      await createCoupon({ code });
      const again = await createCoupon({ code });
      expect(again.status).toBe(409);
    });

    it("validates a percentage coupon and returns the computed discount", async () => {
      const code = `PCT-${uniq()}`;
      await createCoupon({ code, value: 10 });
      const res = await api(app)
        .post("/api/v1/coupons/validate")
        .set(bearer(cashierToken))
        .send({ code, orderSubtotal: 100 });
      expect(res.status).toBe(200);
      expect(res.body.data.validation.valid).toBe(true);
      expect(res.body.data.validation.discount).toBe(10); // 10% من 100
    });

    it("validation reports an unknown code as invalid (not an error)", async () => {
      const res = await api(app)
        .post("/api/v1/coupons/validate")
        .set(bearer(cashierToken))
        .send({ code: "NON-EXISTENT-CODE", orderSubtotal: 100 });
      expect(res.status).toBe(200);
      expect(res.body.data.validation.valid).toBe(false);
    });

    it("CASHIER can validate (view) but cannot create (403)", async () => {
      const res = await api(app)
        .post("/api/v1/coupons")
        .set(bearer(cashierToken))
        .send({ code: `NO-${uniq()}`, type: "PERCENTAGE", value: 5 });
      expect(res.status).toBe(403);
    });
  });

  describe("loyalty", () => {
    it("returns settings and adjusts a customer's points", async () => {
      const settings = await api(app).get("/api/v1/loyalty/settings").set(bearer(adminToken));
      expect(settings.status).toBe(200);
      expect(settings.body.data.settings).toBeTruthy();

      const customer = await createCustomer(app, adminToken);
      const adjust = await api(app)
        .post("/api/v1/loyalty/adjust")
        .set(bearer(adminToken))
        .send({ customerId: customer.id, points: 50, reason: "welcome bonus" });
      expect(adjust.status).toBe(200);
      expect(Number(adjust.body.data.summary.currentPoints)).toBeGreaterThanOrEqual(50);
    });

    it("CASHIER can view accounts but cannot adjust points (403)", async () => {
      const accounts = await api(app).get("/api/v1/loyalty/accounts").set(bearer(cashierToken));
      expect(accounts.status).toBe(200);
      const customer = await createCustomer(app, adminToken);
      const adjust = await api(app)
        .post("/api/v1/loyalty/adjust")
        .set(bearer(cashierToken))
        .send({ customerId: customer.id, points: 10, reason: "x" });
      expect(adjust.status).toBe(403);
    });

    it("rejects adjusting points by zero (400)", async () => {
      const customer = await createCustomer(app, adminToken);
      const res = await api(app)
        .post("/api/v1/loyalty/adjust")
        .set(bearer(adminToken))
        .send({ customerId: customer.id, points: 0, reason: "x" });
      expect(res.status).toBe(400);
    });
  });

  describe("membership", () => {
    it("lists tiers and sets a customer's level manually (once they have a loyalty account)", async () => {
      const tiers = await api(app).get("/api/v1/membership/tiers").set(bearer(adminToken));
      expect(tiers.status).toBe(200);
      expect(Array.isArray(tiers.body.data.tiers)).toBe(true);

      const customer = await createCustomer(app, adminToken);
      // قاعدة عمل حقيقية: set-level يتطلّب حساب ولاء قائماً للعميل - نُنشئه بتعديل نقاط أولاً
      await api(app).post("/api/v1/loyalty/adjust").set(bearer(adminToken)).send({ customerId: customer.id, points: 5, reason: "seed account" });
      const setLevel = await api(app)
        .post("/api/v1/membership/set-level")
        .set(bearer(adminToken))
        .send({ customerId: customer.id, level: "GOLD" });
      expect(setLevel.status).toBe(200);
    });

    it("set-level on a customer with no loyalty account → 404 (documented business rule)", async () => {
      const customer = await createCustomer(app, adminToken);
      const res = await api(app)
        .post("/api/v1/membership/set-level")
        .set(bearer(adminToken))
        .send({ customerId: customer.id, level: "SILVER" });
      expect(res.status).toBe(404);
    });

    it("CASHIER cannot set a membership level (403)", async () => {
      const customer = await createCustomer(app, adminToken);
      const res = await api(app)
        .post("/api/v1/membership/set-level")
        .set(bearer(cashierToken))
        .send({ customerId: customer.id, level: "SILVER" });
      expect(res.status).toBe(403);
    });
  });
});
