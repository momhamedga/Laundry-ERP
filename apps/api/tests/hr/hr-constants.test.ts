import { describe, expect, it } from "vitest";
import {
  DOCUMENT_EXPIRY_WARN_DAYS,
  inclusiveDays,
  STANDARD_WORK_HOURS,
  toDateOnly,
  todayDate,
} from "../../src/modules/hr/hr.constants";

describe("HR date helpers", () => {
  it("toDateOnly normalizes a timestamp to UTC midnight", () => {
    const d = toDateOnly(new Date("2026-07-29T13:45:12.000Z"));
    expect(d.toISOString()).toBe("2026-07-29T00:00:00.000Z");
  });

  it("inclusiveDays counts both endpoints", () => {
    expect(inclusiveDays(new Date("2026-08-01"), new Date("2026-08-01"))).toBe(1);
    expect(inclusiveDays(new Date("2026-08-01"), new Date("2026-08-03"))).toBe(3);
  });

  it("inclusiveDays is timezone-stable across intra-day times", () => {
    expect(
      inclusiveDays(new Date("2026-08-01T23:00:00Z"), new Date("2026-08-03T01:00:00Z")),
    ).toBe(3);
  });

  it("todayDate returns a UTC-midnight Date", () => {
    const t = todayDate(new Date("2026-07-29T10:00:00.000Z"));
    expect(t.toISOString().endsWith("T00:00:00.000Z")).toBe(true);
  });

  it("exposes sane standard constants", () => {
    expect(STANDARD_WORK_HOURS).toBe(8);
    expect(DOCUMENT_EXPIRY_WARN_DAYS).toBeGreaterThan(0);
  });
});
