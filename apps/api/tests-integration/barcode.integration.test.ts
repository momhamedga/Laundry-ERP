import type { Express } from "express";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase } from "./setup/db.js";
import { uniq } from "./setup/factories.js";
import { api, bearer, makeApp, resetRateLimiters, seedAndLogin } from "./setup/harness.js";

describe("barcode (integration)", () => {
  let app: Express;
  let adminToken: string;
  let managerToken: string;
  let cashierToken: string;

  async function createItem() {
    const res = await api(app)
      .post("/api/v1/inventory/items")
      .set(bearer(adminToken))
      .send({ sku: `SKU-${uniq()}`, name: `Item ${uniq()}`, quantity: 5 });
    return res.body.data.item;
  }

  beforeEach(async () => {
    await resetDatabase();
    await resetRateLimiters();
    app = makeApp();
    adminToken = (await seedAndLogin(app, "ADMIN", "bc")).accessToken;
    managerToken = (await seedAndLogin(app, "MANAGER", "bc")).accessToken;
    cashierToken = (await seedAndLogin(app, "CASHIER", "bc")).accessToken;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns a random SKU (barcode:create)", async () => {
    const res = await api(app).get("/api/v1/barcodes/random-sku").set(bearer(adminToken));
    expect(res.status).toBe(200);
  });

  it("generates a barcode for an item, then looks it up and scans it", async () => {
    const item = await createItem();
    const gen = await api(app)
      .post(`/api/v1/barcodes/items/${item.id}/generate`)
      .set(bearer(adminToken))
      .send({ type: "CODE128", mode: "auto" });
    expect(gen.status).toBe(200);
    const code = gen.body.data.item.barcode;
    expect(code).toBeTruthy();

    const lookup = await api(app).get(`/api/v1/barcodes/lookup?code=${encodeURIComponent(code)}`).set(bearer(adminToken));
    expect(lookup.status).toBe(200);

    const scan = await api(app).post("/api/v1/barcodes/scan").set(bearer(adminToken)).send({ code, action: "LOOKUP" });
    expect(scan.status).toBe(200);
  });

  it("records a scan of an unknown code without a server error", async () => {
    const scan = await api(app).post("/api/v1/barcodes/scan").set(bearer(adminToken)).send({ code: "UNKNOWN-CODE-XYZ", action: "LOOKUP" });
    expect([200, 404]).toContain(scan.status);
  });

  it("CASHIER cannot generate a barcode (no barcode:create) → 403", async () => {
    const item = await createItem();
    const res = await api(app).post(`/api/v1/barcodes/items/${item.id}/generate`).set(bearer(cashierToken)).send({ type: "CODE128", mode: "auto" });
    expect(res.status).toBe(403);
  });

  describe("templates", () => {
    it("MANAGER can create a template; CASHIER cannot (403)", async () => {
      const mgr = await api(app)
        .post("/api/v1/barcodes/templates")
        .set(bearer(managerToken))
        .send({ name: `Tpl-${uniq()}`, size: "A4" });
      expect(mgr.status).toBe(201);
      const cash = await api(app)
        .post("/api/v1/barcodes/templates")
        .set(bearer(cashierToken))
        .send({ name: `Tpl-${uniq()}`, size: "A4" });
      expect(cash.status).toBe(403);
    });

    it("lists templates (barcode:view)", async () => {
      const res = await api(app).get("/api/v1/barcodes/templates").set(bearer(cashierToken));
      expect(res.status).toBe(200);
    });
  });
});
