import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { createCustomer, createOrder, createService, seedBranch } from "./setup/factories.js";
import { api, bearer, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

describe("orders (integration)", () => {
  let app: Express;
  let adminToken: string;
  let cashierToken: string;
  let branchId: string;
  let customerId: string;
  let serviceId: string; // price = 25

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    adminToken = (await seedAndLogin(app, "ADMIN", "ord")).accessToken;
    cashierToken = (await seedAndLogin(app, "CASHIER", "ord")).accessToken;
    branchId = (await seedBranch()).id;
    customerId = (await createCustomer(app, adminToken)).id;
    serviceId = (await createService(app, adminToken, { price: 25 })).id;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("create + server-side totals", () => {
    it("computes subtotal/total on the server from service price (201)", async () => {
      const order = await createOrder(app, adminToken, {
        customerId,
        branchId,
        items: [{ serviceId, quantity: 2 }], // 25 * 2 = 50
      });
      expect(Number(order.subtotal)).toBe(50);
      expect(Number(order.total)).toBe(50);
      expect(order.status).toBe("RECEIVED");
      expect(order.paymentStatus).toBe("UNPAID");
      expect(order.orderNumber).toMatch(/^ORD-\d{4}-\d{6}$/);
    });

    it("applies an order-level discount to the total", async () => {
      const order = await createOrder(app, adminToken, {
        customerId,
        branchId,
        items: [{ serviceId, quantity: 2 }],
        discount: 10,
      });
      expect(Number(order.subtotal)).toBe(50);
      expect(Number(order.discount)).toBe(10);
      expect(Number(order.total)).toBe(40);
    });

    it("ignores any client-sent price (only quantity/discount are accepted)", async () => {
      const now = Date.now();
      const res = await api(app)
        .post("/api/v1/orders")
        .set(bearer(adminToken))
        .send({
          customerId,
          branchId,
          items: [{ serviceId, quantity: 1, price: 9999 }],
          receivedAt: new Date(now).toISOString(),
          dueDate: new Date(now + 86_400_000).toISOString(),
        });
      expect(res.status).toBe(201);
      expect(Number(res.body.data.order.total)).toBe(25); // price came from the service, not the client
    });

    it("rejects an order with no items (400)", async () => {
      const now = Date.now();
      const res = await api(app)
        .post("/api/v1/orders")
        .set(bearer(adminToken))
        .send({ customerId, branchId, items: [], receivedAt: new Date(now).toISOString(), dueDate: new Date(now + 1000).toISOString() });
      expect(res.status).toBe(400);
    });

    it("rejects dueDate before receivedAt (400)", async () => {
      const now = Date.now();
      const res = await api(app)
        .post("/api/v1/orders")
        .set(bearer(adminToken))
        .send({ customerId, branchId, items: [{ serviceId, quantity: 1 }], receivedAt: new Date(now).toISOString(), dueDate: new Date(now - 1000).toISOString() });
      expect(res.status).toBe(400);
    });

    it("rejects a non-existent branch (404)", async () => {
      const now = Date.now();
      const res = await api(app)
        .post("/api/v1/orders")
        .set(bearer(adminToken))
        .send({ customerId, branchId: "cksbranchmissing000000000", items: [{ serviceId, quantity: 1 }], receivedAt: new Date(now).toISOString(), dueDate: new Date(now + 1000).toISOString() });
      expect(res.status).toBe(404);
    });

    it("rejects an inactive service (400)", async () => {
      await api(app).patch(`/api/v1/services/${serviceId}/status`).set(bearer(adminToken)).send({ isActive: false });
      const now = Date.now();
      const res = await api(app)
        .post("/api/v1/orders")
        .set(bearer(adminToken))
        .send({ customerId, branchId, items: [{ serviceId, quantity: 1 }], receivedAt: new Date(now).toISOString(), dueDate: new Date(now + 86_400_000).toISOString() });
      expect(res.status).toBe(400);
    });
  });

  describe("status lifecycle (forward-only)", () => {
    it("advances forward and records history", async () => {
      const order = await createOrder(app, adminToken, { customerId, branchId, items: [{ serviceId, quantity: 1 }] });
      const adv = await api(app).patch(`/api/v1/orders/${order.id}/status`).set(bearer(adminToken)).send({ status: "INSPECTING" });
      expect(adv.status).toBe(200);
      expect(adv.body.data.order.status).toBe("INSPECTING");
      const history = await api(app).get(`/api/v1/orders/${order.id}/history`).set(bearer(adminToken));
      expect(history.status).toBe(200);
      expect(history.body.data.history.length).toBeGreaterThanOrEqual(1);
    });

    it("forbids a backward transition (400)", async () => {
      const order = await createOrder(app, adminToken, { customerId, branchId, items: [{ serviceId, quantity: 1 }] });
      await api(app).patch(`/api/v1/orders/${order.id}/status`).set(bearer(adminToken)).send({ status: "WASHING" });
      const back = await api(app).patch(`/api/v1/orders/${order.id}/status`).set(bearer(adminToken)).send({ status: "RECEIVED" });
      expect(back.status).toBe(400);
    });

    it("rejects setting CANCELLED via the status endpoint (must use /cancel) → 400", async () => {
      const order = await createOrder(app, adminToken, { customerId, branchId, items: [{ serviceId, quantity: 1 }] });
      const res = await api(app).patch(`/api/v1/orders/${order.id}/status`).set(bearer(adminToken)).send({ status: "CANCELLED" });
      expect(res.status).toBe(400);
    });
  });

  describe("cancel (ADMIN/MANAGER only)", () => {
    it("CASHIER cannot cancel (403)", async () => {
      const order = await createOrder(app, adminToken, { customerId, branchId, items: [{ serviceId, quantity: 1 }] });
      const res = await api(app).post(`/api/v1/orders/${order.id}/cancel`).set(bearer(cashierToken)).send({ notes: "x" });
      expect(res.status).toBe(403);
    });

    it("ADMIN cancels a non-terminal order", async () => {
      const order = await createOrder(app, adminToken, { customerId, branchId, items: [{ serviceId, quantity: 1 }] });
      const res = await api(app).post(`/api/v1/orders/${order.id}/cancel`).set(bearer(adminToken)).send({ notes: "customer request" });
      expect(res.status).toBe(200);
      expect(res.body.data.order.status).toBe("CANCELLED");
    });
  });

  describe("update recomputes totals", () => {
    it("replaces items and recomputes the total on the server", async () => {
      const order = await createOrder(app, adminToken, { customerId, branchId, items: [{ serviceId, quantity: 1 }] });
      expect(Number(order.total)).toBe(25);
      const upd = await api(app).patch(`/api/v1/orders/${order.id}`).set(bearer(adminToken)).send({ items: [{ serviceId, quantity: 4 }] });
      expect(upd.status).toBe(200);
      expect(Number(upd.body.data.order.total)).toBe(100);
    });
  });

  describe("RBAC on create/status", () => {
    it("WORKER cannot create an order (403) but can advance status (200)", async () => {
      const worker = await seedAndLogin(app, "WORKER", "ord");
      const order = await createOrder(app, adminToken, { customerId, branchId, items: [{ serviceId, quantity: 1 }] });
      const create = await api(app)
        .post("/api/v1/orders")
        .set(bearer(worker.accessToken))
        .send({ customerId, branchId, items: [{ serviceId, quantity: 1 }], receivedAt: new Date().toISOString(), dueDate: new Date(Date.now() + 86_400_000).toISOString() });
      expect(create.status).toBe(403);
      const status = await api(app).patch(`/api/v1/orders/${order.id}/status`).set(bearer(worker.accessToken)).send({ status: "INSPECTING" });
      expect(status.status).toBe(200);
    });
  });
});
