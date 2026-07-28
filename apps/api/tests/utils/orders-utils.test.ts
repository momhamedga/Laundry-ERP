import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  canTransition,
  computeTotals,
  derivePaymentStatus,
  formatOrderNumber,
  isTerminal,
  parseSequence,
} from "../../src/modules/orders/orders.utils";

const dec = (n: number) => new Prisma.Decimal(n);
const services = new Map<string, { price: Prisma.Decimal }>([
  ["s1", { price: dec(10) }],
  ["s2", { price: dec(5) }],
]);

describe("orders.utils — computeTotals (server-side money)", () => {
  it("computes subtotal/discount/total from items", () => {
    const t = computeTotals(
      [
        { serviceId: "s1", quantity: 2, discount: 0 },
        { serviceId: "s2", quantity: 1, discount: 0 },
      ] as never,
      services as never,
      5,
    );
    expect(Number(t.subtotal)).toBe(25); // 10*2 + 5*1
    expect(Number(t.discount)).toBe(5);
    expect(Number(t.total)).toBe(20);
  });

  it("applies per-line discount", () => {
    const t = computeTotals([{ serviceId: "s1", quantity: 2, discount: 4 }] as never, services as never, 0);
    expect(Number(t.total)).toBe(16); // 20 - 4
  });

  it("throws when a line discount exceeds the line amount", () => {
    expect(() =>
      computeTotals([{ serviceId: "s1", quantity: 1, discount: 999 }] as never, services as never, 0),
    ).toThrow();
  });

  it("throws when order discount exceeds subtotal", () => {
    expect(() =>
      computeTotals([{ serviceId: "s1", quantity: 1, discount: 0 }] as never, services as never, 500),
    ).toThrow();
  });

  it("throws when a service is missing", () => {
    expect(() =>
      computeTotals([{ serviceId: "ghost", quantity: 1, discount: 0 }] as never, services as never, 0),
    ).toThrow();
  });
});

describe("orders.utils — status lifecycle", () => {
  it("allows forward transitions, forbids backward", () => {
    expect(canTransition("RECEIVED", "WASHING")).toBe(true);
    expect(canTransition("WASHING", "RECEIVED")).toBe(false);
  });
  it("forbids transitions from a terminal state", () => {
    expect(isTerminal("DELIVERED")).toBe(true);
    expect(canTransition("DELIVERED", "READY")).toBe(false);
  });
  it("always allows cancelling a non-terminal order", () => {
    expect(canTransition("RECEIVED", "CANCELLED")).toBe(true);
  });
});

describe("orders.utils — payment status + numbering", () => {
  it("derivePaymentStatus reflects paid vs total", () => {
    expect(derivePaymentStatus(dec(100), dec(0))).toBe("UNPAID");
    expect(derivePaymentStatus(dec(100), dec(40))).toBe("PARTIAL");
    expect(derivePaymentStatus(dec(100), dec(100))).toBe("PAID");
    expect(derivePaymentStatus(dec(100), dec(150))).toBe("PAID");
  });

  it("formatOrderNumber ⇄ parseSequence round-trips", () => {
    const num = formatOrderNumber(2026, 4);
    expect(num).toMatch(/2026/);
    expect(parseSequence(num, num.slice(0, num.length - 6))).toBe(4);
  });
});
