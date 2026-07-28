import { describe, expect, it } from "vitest";
import {
  createCustomerSchema,
  mergeCustomersSchema,
  updateCustomerSchema,
} from "../../src/modules/customers/customers.validator";

const CUID = "cme0000000000000000000000";
const CUID2 = "cme1111111111111111111111";

describe("customers.validator — createCustomerSchema", () => {
  it("accepts a valid customer", () => {
    expect(createCustomerSchema.safeParse({ name: "أحمد", phone: "0123456789" }).success).toBe(true);
  });

  it("lower-cases email", () => {
    const r = createCustomerSchema.safeParse({
      name: "أحمد",
      phone: "0123456789",
      email: "AB@Example.COM",
    });
    expect(r.success && r.data.email).toBe("ab@example.com");
  });

  it("rejects too-short name (boundary)", () => {
    expect(createCustomerSchema.safeParse({ name: "a", phone: "0123456789" }).success).toBe(false);
  });

  it("rejects malformed phone", () => {
    expect(createCustomerSchema.safeParse({ name: "أحمد", phone: "12" }).success).toBe(false);
    expect(createCustomerSchema.safeParse({ name: "أحمد", phone: "abc" }).success).toBe(false);
  });

  it("rejects malformed email", () => {
    expect(
      createCustomerSchema.safeParse({ name: "أحمد", phone: "0123456789", email: "nope" }).success,
    ).toBe(false);
  });
});

describe("customers.validator — update / merge", () => {
  it("updateCustomerSchema rejects an empty patch", () => {
    expect(updateCustomerSchema.safeParse({}).success).toBe(false);
    expect(updateCustomerSchema.safeParse({ name: "اسم جديد" }).success).toBe(true);
  });

  it("mergeCustomersSchema requires distinct source and target", () => {
    expect(mergeCustomersSchema.safeParse({ sourceId: CUID, targetId: CUID }).success).toBe(false);
    expect(mergeCustomersSchema.safeParse({ sourceId: CUID, targetId: CUID2 }).success).toBe(true);
  });
});
