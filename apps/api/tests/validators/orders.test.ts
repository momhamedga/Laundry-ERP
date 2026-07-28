import { describe, expect, it } from "vitest";
import {
  cancelOrderSchema,
  changeStatusSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  orderItemSchema,
  updateOrderSchema,
} from "../../src/modules/orders/orders.validator";

const CUID = "cme0000000000000000000000";
const item = { serviceId: CUID, quantity: 2 };
const base = {
  customerId: CUID,
  receivedAt: "2026-07-01T09:00:00Z",
  dueDate: "2026-07-03T09:00:00Z",
  items: [item],
};

describe("orders.validator — createOrderSchema", () => {
  it("accepts a valid order (positive)", () => {
    const r = createOrderSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.discount).toBe(0); // default
  });

  it("rejects dueDate before receivedAt (business rule)", () => {
    expect(
      createOrderSchema.safeParse({ ...base, dueDate: "2026-06-30T09:00:00Z" }).success,
    ).toBe(false);
  });

  it("rejects empty items array", () => {
    expect(createOrderSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });

  it("rejects a non-cuid customerId (malformed)", () => {
    expect(createOrderSchema.safeParse({ ...base, customerId: "abc" }).success).toBe(false);
  });

  it("rejects negative order discount (boundary)", () => {
    expect(createOrderSchema.safeParse({ ...base, discount: -1 }).success).toBe(false);
  });
});

describe("orders.validator — orderItemSchema", () => {
  it("rejects zero quantity", () => {
    expect(orderItemSchema.safeParse({ serviceId: CUID, quantity: 0 }).success).toBe(false);
  });

  it("rejects >2-decimal quantity (boundary)", () => {
    expect(orderItemSchema.safeParse({ serviceId: CUID, quantity: 1.005 }).success).toBe(false);
  });

  it("rejects negative item discount", () => {
    expect(
      orderItemSchema.safeParse({ serviceId: CUID, quantity: 1, discount: -5 }).success,
    ).toBe(false);
  });

  it("defaults discount to 0", () => {
    const r = orderItemSchema.safeParse({ serviceId: CUID, quantity: 1 });
    expect(r.success && r.data.discount).toBe(0);
  });
});

describe("orders.validator — status / update / list", () => {
  it("changeStatusSchema forbids CANCELLED (must use cancel endpoint)", () => {
    expect(changeStatusSchema.safeParse({ status: "CANCELLED" }).success).toBe(false);
    expect(changeStatusSchema.safeParse({ status: "WASHING" }).success).toBe(true);
  });

  it("updateOrderSchema rejects an empty patch", () => {
    expect(updateOrderSchema.safeParse({}).success).toBe(false);
    expect(updateOrderSchema.safeParse({ discount: 5 }).success).toBe(true);
  });

  it("cancelOrderSchema accepts optional notes", () => {
    expect(cancelOrderSchema.safeParse({}).success).toBe(true);
    expect(cancelOrderSchema.safeParse({ notes: "زبون ألغى" }).success).toBe(true);
  });

  it("listOrdersQuerySchema applies defaults and rejects bad sortBy", () => {
    const r = listOrdersQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(1);
      expect(r.data.sortOrder).toBe("desc");
    }
    expect(listOrdersQuerySchema.safeParse({ sortBy: "nope" }).success).toBe(false);
  });
});
