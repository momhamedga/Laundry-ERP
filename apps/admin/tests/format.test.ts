import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

describe("format helpers", () => {
  it("formatCurrency accepts numbers and Decimal-as-string", () => {
    expect(formatCurrency(1000)).toContain("ج.م");
    expect(formatCurrency("250.5")).toContain("ج.م");
  });

  it("formatDate returns em-dash for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("formatDate renders a real date", () => {
    expect(formatDate("2026-07-29T00:00:00Z")).not.toBe("—");
  });

  it("formatDateTime returns em-dash for null and a string otherwise", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(typeof formatDateTime("2026-07-29T10:30:00Z")).toBe("string");
  });
});
