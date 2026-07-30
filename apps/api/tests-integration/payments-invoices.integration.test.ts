import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { createCustomer, createOrder, createService, seedBranch } from "./setup/factories.js";
import { api, bearer, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

describe("payments + invoices (integration)", () => {
  let app: Express;
  let adminToken: string;
  let cashierToken: string;
  let branchId: string;
  let customerId: string;
  let serviceId: string;

  async function freshOrder(total = 50) {
    // price 25 → quantity total/25
    return createOrder(app, adminToken, {
      customerId,
      branchId,
      items: [{ serviceId, quantity: total / 25 }],
    });
  }

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    adminToken = (await seedAndLogin(app, "ADMIN", "pay")).accessToken;
    cashierToken = (await seedAndLogin(app, "CASHIER", "pay")).accessToken;
    branchId = (await seedBranch()).id;
    customerId = (await createCustomer(app, adminToken)).id;
    serviceId = (await createService(app, adminToken, { price: 25 })).id;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ==================== Payments ====================
  describe("payments", () => {
    it("a full cash payment marks the order PAID and updates paidAmount", async () => {
      const order = await freshOrder(50);
      const res = await api(app)
        .post("/api/v1/payments")
        .set(bearer(cashierToken))
        .send({ orderId: order.id, amount: 50, method: "CASH" });
      expect(res.status).toBe(201);
      const refreshed = await api(app).get(`/api/v1/orders/${order.id}`).set(bearer(adminToken));
      expect(refreshed.body.data.order.paymentStatus).toBe("PAID");
      expect(Number(refreshed.body.data.order.paidAmount)).toBe(50);
    });

    it("a partial payment marks the order PARTIAL", async () => {
      const order = await freshOrder(50);
      const res = await api(app)
        .post("/api/v1/payments")
        .set(bearer(cashierToken))
        .send({ orderId: order.id, amount: 20, method: "CARD", reference: "TXN-1" });
      expect(res.status).toBe(201);
      const refreshed = await api(app).get(`/api/v1/orders/${order.id}`).set(bearer(adminToken));
      expect(refreshed.body.data.order.paymentStatus).toBe("PARTIAL");
    });

    it("rejects a payment that exceeds the order total (400)", async () => {
      const order = await freshOrder(50);
      const res = await api(app)
        .post("/api/v1/payments")
        .set(bearer(cashierToken))
        .send({ orderId: order.id, amount: 60, method: "CASH" });
      expect(res.status).toBe(400);
    });

    it("rejects a zero/negative amount (400)", async () => {
      const order = await freshOrder(50);
      const res = await api(app).post("/api/v1/payments").set(bearer(cashierToken)).send({ orderId: order.id, amount: 0 });
      expect(res.status).toBe(400);
    });

    it("WORKER has no access to payments (403)", async () => {
      const worker = await seedAndLogin(app, "WORKER", "pay");
      const res = await api(app).get("/api/v1/payments").set(bearer(worker.accessToken));
      expect(res.status).toBe(403);
    });

    it("a completed payment is immutable (update → 400)", async () => {
      const order = await freshOrder(50);
      const created = await api(app).post("/api/v1/payments").set(bearer(cashierToken)).send({ orderId: order.id, amount: 50 });
      const upd = await api(app).patch(`/api/v1/payments/${created.body.data.payment.id}`).set(bearer(cashierToken)).send({ amount: 10 });
      expect(upd.status).toBe(400);
    });
  });

  // ==================== Refund + cancel (ADMIN/MANAGER) ====================
  describe("refund + cancel", () => {
    it("ADMIN refunds a completed payment; CASHIER cannot (403)", async () => {
      const order = await freshOrder(50);
      const created = await api(app).post("/api/v1/payments").set(bearer(cashierToken)).send({ orderId: order.id, amount: 50 });
      const paymentId = created.body.data.payment.id;

      const denied = await api(app).post(`/api/v1/payments/${paymentId}/refund`).set(bearer(cashierToken)).send({ reason: "x" });
      expect(denied.status).toBe(403);

      const refund = await api(app).post(`/api/v1/payments/${paymentId}/refund`).set(bearer(adminToken)).send({ reason: "returned" });
      expect(refund.status).toBe(200);
      const refreshed = await api(app).get(`/api/v1/orders/${order.id}`).set(bearer(adminToken));
      expect(refreshed.body.data.order.paymentStatus).not.toBe("PAID");
    });

    it("cancels a pending payment (ADMIN)", async () => {
      const order = await freshOrder(50);
      const pending = await api(app)
        .post("/api/v1/payments")
        .set(bearer(cashierToken))
        .send({ orderId: order.id, amount: 30, method: "CARD", status: "PENDING", reference: "PEND-1" });
      expect(pending.status).toBe(201);
      const cancel = await api(app).post(`/api/v1/payments/${pending.body.data.payment.id}/cancel`).set(bearer(adminToken)).send({ reason: "abandoned" });
      expect(cancel.status).toBe(200);
    });
  });

  // ==================== Invoices ====================
  describe("invoices", () => {
    it("generates an invoice from an order with consistent totals (201)", async () => {
      const order = await freshOrder(50);
      const res = await api(app)
        .post("/api/v1/invoices")
        .set(bearer(cashierToken))
        .send({ orderId: order.id, status: "ISSUED", tax: 5 });
      expect(res.status).toBe(201);
      const inv = res.body.data.invoice;
      expect(inv.invoiceNumber).toMatch(/^INV-\d{4}-\d{6}$/);
      // ثبات داخلي: total = subtotal - discount + tax
      expect(Number(inv.total)).toBe(Number(inv.subtotal) - Number(inv.discount) + Number(inv.tax));
      expect(Number(inv.tax)).toBe(5);
    });

    it("CASHIER can create but cannot update or delete an invoice (403)", async () => {
      const order = await freshOrder(50);
      const created = await api(app).post("/api/v1/invoices").set(bearer(cashierToken)).send({ orderId: order.id });
      const invId = created.body.data.invoice.id;
      const upd = await api(app).put(`/api/v1/invoices/${invId}`).set(bearer(cashierToken)).send({ tax: 3 });
      expect(upd.status).toBe(403);
      const del = await api(app).delete(`/api/v1/invoices/${invId}`).set(bearer(cashierToken));
      expect(del.status).toBe(403);
    });

    it("ADMIN can update and delete an invoice", async () => {
      const order = await freshOrder(50);
      const created = await api(app).post("/api/v1/invoices").set(bearer(adminToken)).send({ orderId: order.id });
      const invId = created.body.data.invoice.id;
      const upd = await api(app).put(`/api/v1/invoices/${invId}`).set(bearer(adminToken)).send({ tax: 7 });
      expect(upd.status).toBe(200);
      expect(Number(upd.body.data.invoice.tax)).toBe(7);
      const del = await api(app).delete(`/api/v1/invoices/${invId}`).set(bearer(adminToken));
      expect([200, 204]).toContain(del.status);
    });

    it("records a payment through the invoice → order endpoint", async () => {
      const order = await freshOrder(50);
      const created = await api(app).post("/api/v1/invoices").set(bearer(adminToken)).send({ orderId: order.id });
      const invId = created.body.data.invoice.id;
      const pay = await api(app).post(`/api/v1/invoices/${invId}/payments`).set(bearer(cashierToken)).send({ amount: 50, method: "CASH" });
      expect(pay.status).toBe(201);
      const list = await api(app).get(`/api/v1/invoices/${invId}/payments`).set(bearer(adminToken));
      expect(list.status).toBe(200);
      expect(list.body.data.payments.length).toBeGreaterThanOrEqual(1);
    });

    it("WORKER has no access to invoices (403)", async () => {
      const worker = await seedAndLogin(app, "WORKER", "pay");
      const res = await api(app).get("/api/v1/invoices").set(bearer(worker.accessToken));
      expect(res.status).toBe(403);
    });
  });
});
