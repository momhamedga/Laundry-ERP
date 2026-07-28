import { describe, expect, it } from "vitest";
import {
  createSupplierSchema,
  updateSupplierSchema,
} from "../../src/modules/suppliers/suppliers.validator";
import {
  createPurchaseSchema,
  updatePurchaseSchema,
} from "../../src/modules/purchases/purchases.validator";
import {
  manualLevelSchema,
  updateTierSchema,
} from "../../src/modules/membership/membership.validator";
import {
  branchStatusSchema,
  createBranchSchema,
  updateBranchSchema,
} from "../../src/modules/branches/branches.validator";

const CUID = "cme0000000000000000000000";

describe("suppliers.validator", () => {
  it("accepts a valid supplier (contact optional)", () => {
    expect(createSupplierSchema.safeParse({ name: "المورّد" }).success).toBe(true);
  });
  it("rejects short name and bad email", () => {
    expect(createSupplierSchema.safeParse({ name: "x" }).success).toBe(false);
    expect(createSupplierSchema.safeParse({ name: "المورّد", email: "bad" }).success).toBe(false);
  });
  it("update rejects empty patch", () => {
    expect(updateSupplierSchema.safeParse({}).success).toBe(false);
  });
});

describe("purchases.validator", () => {
  const line = { itemId: CUID, quantity: 5, unitCost: 10 };
  it("accepts a valid purchase with defaults", () => {
    const r = createPurchaseSchema.safeParse({ supplierId: CUID, items: [line] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.taxRate).toBe(0);
  });
  it("rejects empty items and non-positive quantity", () => {
    expect(createPurchaseSchema.safeParse({ supplierId: CUID, items: [] }).success).toBe(false);
    expect(
      createPurchaseSchema.safeParse({ supplierId: CUID, items: [{ ...line, quantity: 0 }] }).success,
    ).toBe(false);
  });
  it("rejects taxRate above 100 (boundary)", () => {
    expect(
      createPurchaseSchema.safeParse({ supplierId: CUID, taxRate: 101, items: [line] }).success,
    ).toBe(false);
  });
  it("update rejects empty patch", () => {
    expect(updatePurchaseSchema.safeParse({}).success).toBe(false);
  });
});

describe("membership.validator", () => {
  it("updateTierSchema bounds discountPercent to 0..100", () => {
    expect(updateTierSchema.safeParse({ discountPercent: 50 }).success).toBe(true);
    expect(updateTierSchema.safeParse({ discountPercent: 150 }).success).toBe(false);
    expect(updateTierSchema.safeParse({}).success).toBe(false);
  });
  it("manualLevelSchema validates level enum", () => {
    expect(manualLevelSchema.safeParse({ customerId: CUID, level: "GOLD" }).success).toBe(true);
    expect(manualLevelSchema.safeParse({ customerId: CUID, level: "TITANIUM" }).success).toBe(false);
  });
});

describe("branches.validator", () => {
  it("accepts a valid branch", () => {
    expect(createBranchSchema.safeParse({ name: "الفرع الرئيسي" }).success).toBe(true);
    expect(createBranchSchema.safeParse({ name: "x" }).success).toBe(false);
  });
  it("branchStatusSchema requires boolean", () => {
    expect(branchStatusSchema.safeParse({ isActive: false }).success).toBe(true);
    expect(branchStatusSchema.safeParse({ isActive: 1 }).success).toBe(false);
  });
  it("update rejects empty patch", () => {
    expect(updateBranchSchema.safeParse({}).success).toBe(false);
  });
});
