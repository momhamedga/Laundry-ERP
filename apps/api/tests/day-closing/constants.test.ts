import { describe, expect, it } from "vitest";
import {
  businessDateFor,
  formatBusinessDate,
} from "../../src/modules/day-closing/day-closing.constants";

describe("Day-closing date helpers", () => {
  it("formatBusinessDate returns YYYY-MM-DD", () => {
    expect(formatBusinessDate(new Date("2026-07-29T00:00:00.000Z"))).toBe("2026-07-29");
  });

  it("businessDateFor returns a UTC-midnight Date for a given instant", () => {
    const d = businessDateFor(new Date("2026-07-29T12:00:00.000Z"));
    expect(d.toISOString().endsWith("T00:00:00.000Z")).toBe(true);
  });

  it("businessDateFor is stable for the same calendar day", () => {
    const a = businessDateFor(new Date("2026-07-29T09:00:00.000Z"));
    const b = businessDateFor(new Date("2026-07-29T20:00:00.000Z"));
    expect(formatBusinessDate(a)).toBe(formatBusinessDate(b));
  });
});
