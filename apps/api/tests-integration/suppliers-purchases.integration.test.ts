import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { uniq, uniquePhone } from "./setup/factories.js";
import { api, bearer, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

describe("suppliers + purchases (integration)", () => {
  let app: Express;
  let adminToken: string;
  let managerToken: string;
  let cashierToken: string;

  async function createSupplier(over: { name?: string } = {}) {
    const res = await api(app)
      .post("/api/v1/suppliers")
      .set(bearer(adminToken))
      .send({ name: over.name ?? `Sup-${uniq()}`, phone: uniquePhone() });
    if (res.status !== 201) throw new Error(`createSupplier ${res.status}: ${JSON.stringify(res.body)}`);
    return res.body.data.supplier;
  }

  async function createItem() {
    const res = await api(app)
      .post("/api/v1/inventory/items")
      .set(bearer(adminToken))
      .send({ sku: `SKU-${uniq()}`, name: `Item ${uniq()}`, quantity: 0, reorderLevel: 5 });
    if (res.status !== 201) throw new Error(`createItem ${res.status}: ${JSON.stringify(res.body)}`);
    return res.body.data.item;
  }

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    adminToken = (await seedAndLogin(app, "ADMIN", "sup")).accessToken;
    managerToken = (await seedAndLogin(app, "MANAGER", "sup")).accessToken;
    cashierToken = (await seedAndLogin(app, "CASHIER", "sup")).accessToken;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("suppliers CRUD + RBAC", () => {
    it("ADMIN creates a supplier (201)", async () => {
      const s = await createSupplier({ name: "Acme Supplies" });
      expect(s.name).toBe("Acme Supplies");
    });

    it("MANAGER can manage; CASHIER cannot (403)", async () => {
      const mgr = await api(app).post("/api/v1/suppliers").set(bearer(managerToken)).send({ name: `Sup-${uniq()}` });
      expect(mgr.status).toBe(201);
      const cash = await api(app).post("/api/v1/suppliers").set(bearer(cashierToken)).send({ name: `Sup-${uniq()}` });
      expect(cash.status).toBe(403);
    });

    it("rejects a short name (400)", async () => {
      const res = await api(app).post("/api/v1/suppliers").set(bearer(adminToken)).send({ name: "X" });
      expect(res.status).toBe(400);
    });

    it("updates then soft-deletes and restores", async () => {
      const s = await createSupplier();
      const upd = await api(app).patch(`/api/v1/suppliers/${s.id}`).set(bearer(adminToken)).send({ name: "Renamed Supplier" });
      expect(upd.status).toBe(200);
      const del = await api(app).delete(`/api/v1/suppliers/${s.id}`).set(bearer(adminToken));
      expect([200, 204]).toContain(del.status);
      const restore = await api(app).patch(`/api/v1/suppliers/${s.id}/restore`).set(bearer(adminToken));
      expect(restore.status).toBe(200);
    });
  });

  describe("purchases lifecycle (receive increases stock)", () => {
    it("creates a DRAFT purchase then receives it, increasing item stock", async () => {
      const supplier = await createSupplier();
      const item = await createItem(); // qty 0
      const created = await api(app)
        .post("/api/v1/purchases")
        .set(bearer(adminToken))
        .send({ supplierId: supplier.id, taxRate: 0, items: [{ itemId: item.id, quantity: 8, unitCost: 3 }] });
      expect(created.status).toBe(201);
      expect(created.body.data.purchase.status).toBe("DRAFT");
      const purchaseId = created.body.data.purchase.id;

      const received = await api(app).post(`/api/v1/purchases/${purchaseId}/receive`).set(bearer(adminToken)).send({});
      expect(received.status).toBe(200);
      expect(received.body.data.purchase.status).toBe("RECEIVED");

      const itemAfter = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
      expect(Number(itemAfter?.quantity)).toBe(8); // 0 + 8 من الاستلام
    });

    it("cannot receive the same purchase twice (409)", async () => {
      const supplier = await createSupplier();
      const item = await createItem();
      const created = await api(app)
        .post("/api/v1/purchases")
        .set(bearer(adminToken))
        .send({ supplierId: supplier.id, items: [{ itemId: item.id, quantity: 4, unitCost: 2 }] });
      const purchaseId = created.body.data.purchase.id;
      await api(app).post(`/api/v1/purchases/${purchaseId}/receive`).set(bearer(adminToken)).send({});
      const twice = await api(app).post(`/api/v1/purchases/${purchaseId}/receive`).set(bearer(adminToken)).send({});
      expect(twice.status).toBe(409);
    });

    it("cannot cancel a received purchase (409)", async () => {
      const supplier = await createSupplier();
      const item = await createItem();
      const created = await api(app)
        .post("/api/v1/purchases")
        .set(bearer(adminToken))
        .send({ supplierId: supplier.id, items: [{ itemId: item.id, quantity: 2, unitCost: 1 }] });
      const purchaseId = created.body.data.purchase.id;
      await api(app).post(`/api/v1/purchases/${purchaseId}/receive`).set(bearer(adminToken)).send({});
      const cancel = await api(app).post(`/api/v1/purchases/${purchaseId}/cancel`).set(bearer(adminToken)).send({});
      expect(cancel.status).toBe(409);
    });

    it("rejects a purchase with no items (400)", async () => {
      const supplier = await createSupplier();
      const res = await api(app).post("/api/v1/purchases").set(bearer(adminToken)).send({ supplierId: supplier.id, items: [] });
      expect(res.status).toBe(400);
    });

    it("CASHIER cannot create a purchase (403)", async () => {
      const supplier = await createSupplier();
      const item = await createItem();
      const res = await api(app)
        .post("/api/v1/purchases")
        .set(bearer(cashierToken))
        .send({ supplierId: supplier.id, items: [{ itemId: item.id, quantity: 1, unitCost: 1 }] });
      expect(res.status).toBe(403);
    });
  });
});
