import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { uniq } from "./setup/factories.js";
import { api, bearer, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

describe("inventory (integration)", () => {
  let app: Express;
  let adminToken: string;
  let managerToken: string;
  let cashierToken: string;

  async function createItem(over: { sku?: string; quantity?: number; reorderLevel?: number } = {}) {
    const res = await api(app)
      .post("/api/v1/inventory/items")
      .set(bearer(adminToken))
      .send({
        sku: over.sku ?? `SKU-${uniq()}`,
        name: `Item ${uniq()}`,
        quantity: over.quantity ?? 10,
        reorderLevel: over.reorderLevel ?? 5,
      });
    if (res.status !== 201) throw new Error(`createItem ${res.status}: ${JSON.stringify(res.body)}`);
    return res.body.data.item;
  }

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    adminToken = (await seedAndLogin(app, "ADMIN", "inv")).accessToken;
    managerToken = (await seedAndLogin(app, "MANAGER", "inv")).accessToken;
    cashierToken = (await seedAndLogin(app, "CASHIER", "inv")).accessToken;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("items + opening balance", () => {
    it("creates an item with an opening balance recorded as an OPENING movement", async () => {
      const item = await createItem({ quantity: 10 });
      expect(Number(item.quantity)).toBe(10);
      const movements = await api(app).get(`/api/v1/inventory/movements`).set(bearer(adminToken));
      expect(movements.status).toBe(200);
      const types = movements.body.data.movements.map((m: { type: string }) => m.type);
      expect(types).toContain("OPENING");
    });

    it("rejects an empty SKU (400)", async () => {
      const res = await api(app).post("/api/v1/inventory/items").set(bearer(adminToken)).send({ sku: "", name: "No SKU" });
      expect(res.status).toBe(400);
    });

    it("rejects a duplicate SKU (400/409)", async () => {
      const sku = `SKU-${uniq()}`;
      await createItem({ sku });
      const res = await api(app).post("/api/v1/inventory/items").set(bearer(adminToken)).send({ sku, name: "Dup" });
      expect([400, 409]).toContain(res.status);
    });
  });

  describe("stock movements + negative-stock guard", () => {
    it("IN increases and OUT decreases the balance", async () => {
      const item = await createItem({ quantity: 10 });
      const inc = await api(app).post(`/api/v1/inventory/items/${item.id}/movement`).set(bearer(adminToken)).send({ type: "IN", quantity: 5 });
      expect(inc.status).toBe(200);
      expect(Number(inc.body.data.item.quantity)).toBe(15);
      const dec = await api(app).post(`/api/v1/inventory/items/${item.id}/movement`).set(bearer(adminToken)).send({ type: "OUT", quantity: 5 });
      expect(dec.status).toBe(200);
      expect(Number(dec.body.data.item.quantity)).toBe(10);
    });

    it("forbids an OUT movement exceeding the available balance (400)", async () => {
      const item = await createItem({ quantity: 10 });
      const res = await api(app).post(`/api/v1/inventory/items/${item.id}/movement`).set(bearer(adminToken)).send({ type: "OUT", quantity: 100 });
      expect(res.status).toBe(400);
      const inDb = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
      expect(Number(inDb?.quantity)).toBe(10); // لم يتغيّر - المعاملة تراجعت
    });

    it("adjusts to an absolute new quantity with a reason", async () => {
      const item = await createItem({ quantity: 10 });
      const res = await api(app).post(`/api/v1/inventory/items/${item.id}/adjust`).set(bearer(adminToken)).send({ newQuantity: 3, reason: "stock count correction" });
      expect(res.status).toBe(200);
      expect(Number(res.body.data.item.quantity)).toBe(3);
    });

    it("requires a reason for an adjustment (400)", async () => {
      const item = await createItem({ quantity: 10 });
      const res = await api(app).post(`/api/v1/inventory/items/${item.id}/adjust`).set(bearer(adminToken)).send({ newQuantity: 3 });
      expect(res.status).toBe(400);
    });
  });

  describe("RBAC", () => {
    it("MANAGER can create; CASHIER has no inventory access (403)", async () => {
      const mgr = await api(app).post("/api/v1/inventory/items").set(bearer(managerToken)).send({ sku: `SKU-${uniq()}`, name: "By Manager" });
      expect(mgr.status).toBe(201);
      const cash = await api(app).get("/api/v1/inventory/items").set(bearer(cashierToken));
      expect(cash.status).toBe(403);
    });

    it("lists items with pagination + reads stats/alerts", async () => {
      await createItem();
      await createItem();
      const list = await api(app).get("/api/v1/inventory/items?page=1&limit=1").set(bearer(adminToken));
      expect(list.status).toBe(200);
      expect(list.body.data.items.length).toBe(1);
      expect(list.body.meta.total).toBeGreaterThanOrEqual(2);
      const stats = await api(app).get("/api/v1/inventory/stats").set(bearer(adminToken));
      expect(stats.status).toBe(200);
      const alerts = await api(app).get("/api/v1/inventory/alerts").set(bearer(adminToken));
      expect(alerts.status).toBe(200);
    });
  });
});
