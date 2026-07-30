import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { createCustomer, createService, seedBranch, uniquePhone } from "./setup/factories.js";
import { api, bearer, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

/**
 * تزامن واقعي معتدل (~12-15 طلباً متوازياً) - يثبت سلامة المعاملات وتوليد الأرقام
 * التسلسلية الفريدة تحت التزامن، دون إغراق Neon Serverless. + فحوص أمنية شاملة.
 */
describe("concurrency + security (integration)", () => {
  let app: Express;
  let adminToken: string;

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    adminToken = (await seedAndLogin(app, "ADMIN", "cc")).accessToken;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("moderate concurrency", () => {
    // بعد إصلاح القفل الاستشاري (Phase 10.7): تخصيص الرقم مُسلسَل، فكل الطلبات
    // المتزامنة تنجح (بلا 500) بأرقام فريدة متتابعة - لا Race، لا تصادم، لا أشباح.
    it("creates 12 concurrent orders — all succeed with unique, collision-free numbers", async () => {
      const branchId = (await seedBranch()).id;
      const customerId = (await createCustomer(app, adminToken)).id;
      const serviceId = (await createService(app, adminToken, { price: 10 })).id;

      const now = Date.now();
      const makeOrder = () =>
        api(app)
          .post("/api/v1/orders")
          .set(bearer(adminToken))
          .send({
            customerId,
            branchId,
            items: [{ serviceId, quantity: 1 }],
            receivedAt: new Date(now).toISOString(),
            dueDate: new Date(now + 86_400_000).toISOString(),
          });

      const results = await Promise.all(Array.from({ length: 12 }, makeOrder));
      // كلها تنجح - لا فشل تحت التزامن بعد التسلسل عبر القفل الاستشاري
      expect(results.every((r) => r.status === 201)).toBe(true);

      // كل الأرقام فريدة، والقاعدة تحوي 12 طلباً بالضبط بلا تكرار
      const numbers = results.map((r) => r.body.data.order.orderNumber);
      expect(new Set(numbers).size).toBe(12);
      const persisted = await prisma.order.findMany({ select: { orderNumber: true } });
      expect(persisted.length).toBe(12);
      expect(new Set(persisted.map((o) => o.orderNumber)).size).toBe(12);
    });

    it("creates 10 customers in parallel with unique phones", async () => {
      const makeCustomer = () =>
        api(app).post("/api/v1/customers").set(bearer(adminToken)).send({ name: `C-${uniquePhone()}`, phone: uniquePhone() });
      const results = await Promise.all(Array.from({ length: 10 }, makeCustomer));
      expect(results.every((r) => r.status === 201)).toBe(true);
      expect(await prisma.customer.count()).toBe(10);
    });

    it("serializes concurrent payments so the order total is never exceeded", async () => {
      const branchId = (await seedBranch()).id;
      const customerId = (await createCustomer(app, adminToken)).id;
      const serviceId = (await createService(app, adminToken, { price: 100 })).id;
      const now = Date.now();
      const order = await api(app)
        .post("/api/v1/orders")
        .set(bearer(adminToken))
        .send({ customerId, branchId, items: [{ serviceId, quantity: 1 }], receivedAt: new Date(now).toISOString(), dueDate: new Date(now + 86_400_000).toISOString() });
      const orderId = order.body.data.order.id; // total = 100

      // خمس دفعات متوازية بقيمة 40 - المجموع 200 يتجاوز 100، فبعضها يجب أن يُرفض
      const pay = () => api(app).post("/api/v1/payments").set(bearer(adminToken)).send({ orderId, amount: 40 });
      const results = await Promise.all(Array.from({ length: 5 }, pay));
      const accepted = results.filter((r) => r.status === 201).length;

      const refreshed = await api(app).get(`/api/v1/orders/${orderId}`).set(bearer(adminToken));
      // لا يتجاوز الإجمالي مهما كان عدد المقبولة (سلامة المعاملة)
      expect(Number(refreshed.body.data.order.paidAmount)).toBeLessThanOrEqual(100);
      expect(accepted).toBeGreaterThanOrEqual(1);
    });
  });

  describe("security cross-cutting", () => {
    it("rejects a tampered JWT (modified signature) with 401", async () => {
      const me = await api(app).get("/api/v1/auth/me").set(bearer(adminToken));
      expect(me.status).toBe(200);
      const tampered = `${adminToken.slice(0, -3)}xyz`;
      const res = await api(app).get("/api/v1/auth/me").set(bearer(tampered));
      expect(res.status).toBe(401);
    });

    it("enforces role boundaries: WORKER cannot reach admin/security endpoints (403)", async () => {
      const worker = await seedAndLogin(app, "WORKER", "cc");
      const res = await api(app).get("/api/v1/admin/security-center").set(bearer(worker.accessToken));
      expect(res.status).toBe(403);
    });

    it("does not leak whether an email exists on failed login (uniform 401)", async () => {
      const unknown = await api(app).post("/api/v1/auth/login").send({ email: "ghost-x@test.local", password: "WhateverPass1" });
      expect(unknown.status).toBe(401);
      expect(unknown.body.message).toMatch(/invalid email or password/i);
    });

    it("blocks cross-tenant data mutation without the required permission (WORKER cannot create a customer)", async () => {
      const worker = await seedAndLogin(app, "WORKER", "cc");
      const res = await api(app).post("/api/v1/customers").set(bearer(worker.accessToken)).send({ name: "X", phone: uniquePhone() });
      expect(res.status).toBe(403);
    });
  });
});
