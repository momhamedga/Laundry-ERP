import { describe, expect, it } from "vitest";
import {
  createInvoicePaymentSchema,
  createInvoiceSchema,
  emailInvoiceSchema,
  updateInvoiceSchema,
} from "../../src/modules/invoices/invoice.validator";

const CUID = "cme0000000000000000000000";

describe("invoice.validator — createInvoiceSchema", () => {
  it("accepts orderId with default ISSUED status and 0 tax", () => {
    const r = createInvoiceSchema.safeParse({ orderId: CUID });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.status).toBe("ISSUED");
      expect(r.data.tax).toBe(0);
    }
  });

  it("rejects a derived status like PAID on create", () => {
    expect(createInvoiceSchema.safeParse({ orderId: CUID, status: "PAID" }).success).toBe(false);
    expect(createInvoiceSchema.safeParse({ orderId: CUID, status: "DRAFT" }).success).toBe(true);
  });

  it("rejects negative / >2-decimal tax (boundary)", () => {
    expect(createInvoiceSchema.safeParse({ orderId: CUID, tax: -1 }).success).toBe(false);
    expect(createInvoiceSchema.safeParse({ orderId: CUID, tax: 1.005 }).success).toBe(false);
  });
});

describe("invoice.validator — update / email / payment", () => {
  it("updateInvoiceSchema rejects an empty patch", () => {
    expect(updateInvoiceSchema.safeParse({}).success).toBe(false);
  });

  it("emailInvoiceSchema requires a valid email", () => {
    expect(emailInvoiceSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(emailInvoiceSchema.safeParse({ email: "nope" }).success).toBe(false);
  });

  it("createInvoicePaymentSchema needs no orderId and a positive amount", () => {
    const r = createInvoicePaymentSchema.safeParse({ amount: 100 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.method).toBe("CASH");
    expect(createInvoicePaymentSchema.safeParse({ amount: 0 }).success).toBe(false);
  });
});
