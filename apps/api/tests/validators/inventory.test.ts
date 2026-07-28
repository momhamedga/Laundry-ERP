import { describe, expect, it } from "vitest";
import {
  createItemSchema,
  listItemsQuerySchema,
  updateItemSchema,
} from "../../src/modules/inventory/inventory.validator";

describe("inventory.validator — createItemSchema", () => {
  it("accepts a valid item with defaults", () => {
    const r = createItemSchema.safeParse({ sku: "SKU-1", name: "منظف" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.type).toBe("PRODUCT");
      expect(r.data.unit).toBe("PIECE");
      expect(r.data.quantity).toBe(0);
      expect(r.data.costPrice).toBe(0);
    }
  });

  it("rejects empty SKU and short name", () => {
    expect(createItemSchema.safeParse({ sku: "", name: "منظف" }).success).toBe(false);
    expect(createItemSchema.safeParse({ sku: "S", name: "x" }).success).toBe(false);
  });

  it("rejects negative quantity / cost", () => {
    expect(createItemSchema.safeParse({ sku: "S", name: "منظف", quantity: -1 }).success).toBe(false);
    expect(createItemSchema.safeParse({ sku: "S", name: "منظف", costPrice: -5 }).success).toBe(false);
  });

  it("coerces numeric strings for quantity", () => {
    const r = createItemSchema.safeParse({ sku: "S", name: "منظف", quantity: "12" });
    expect(r.success && r.data.quantity).toBe(12);
  });
});

describe("inventory.validator — update / list", () => {
  it("updateItemSchema rejects an empty patch", () => {
    expect(updateItemSchema.safeParse({}).success).toBe(false);
    expect(updateItemSchema.safeParse({ costPrice: 3 }).success).toBe(true);
  });

  it("listItemsQuerySchema parses string booleans distinctly", () => {
    const r = listItemsQuerySchema.safeParse({ isActive: "false", lowStock: "true" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.isActive).toBe(false);
      expect(r.data.lowStock).toBe(true);
    }
  });
});
