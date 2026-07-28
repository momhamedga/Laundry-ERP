import { describe, expect, it } from "vitest";
import {
  ATTENDANCE_STATUS_BADGE,
  ATTENDANCE_STATUS_LABELS,
  LEAVE_STATUS_LABELS,
  minutesToHhMm,
  PAYROLL_STATUS_LABELS,
} from "@/components/hr/hr-format";
import { DAY_STATUS_LABELS, differenceTone } from "@/components/day-closing/day-format";

const BADGE_VARIANTS = new Set(["default", "secondary", "outline", "destructive", "ghost", "link"]);

describe("HR format maps", () => {
  it("labels every attendance status", () => {
    for (const k of ["PRESENT", "LATE", "ABSENT", "ON_LEAVE", "HALF_DAY"] as const) {
      expect(ATTENDANCE_STATUS_LABELS[k]).toBeTruthy();
      expect(BADGE_VARIANTS.has(ATTENDANCE_STATUS_BADGE[k])).toBe(true);
    }
  });

  it("labels leave and payroll statuses", () => {
    expect(LEAVE_STATUS_LABELS.APPROVED).toBeTruthy();
    expect(PAYROLL_STATUS_LABELS.DRAFT).toBeTruthy();
  });

  it("minutesToHhMm formats hours and minutes", () => {
    expect(minutesToHhMm(0)).toBe("0س 0د");
    expect(minutesToHhMm(90)).toBe("1س 30د");
    expect(minutesToHhMm(485)).toBe("8س 5د");
  });
});

describe("Day-closing format", () => {
  it("labels every day status with a valid badge variant", () => {
    for (const k of ["OPEN", "CLOSED", "REOPENED"] as const) {
      expect(DAY_STATUS_LABELS[k]).toBeTruthy();
    }
  });

  it("differenceTone maps sign to tone", () => {
    expect(differenceTone(null)).toBe("default");
    expect(differenceTone(0)).toBe("default");
    expect(differenceTone(10)).toBe("success");
    expect(differenceTone(-10)).toBe("destructive");
  });
});
