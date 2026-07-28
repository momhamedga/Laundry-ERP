import { describe, expect, it } from "vitest";
import { createLeaveSchema, reviewLeaveSchema } from "../../src/modules/hr/leaves.validator";
import {
  generatePayrollSchema,
  upsertSalaryComponentSchema,
} from "../../src/modules/hr/payroll.validator";
import { clockActionSchema } from "../../src/modules/hr/attendance.validator";

const CUID = "cme0000000000000000000000";

describe("HR — leave validators", () => {
  it("createLeaveSchema requires start <= end", () => {
    const bad = createLeaveSchema.safeParse({
      employeeProfileId: CUID,
      type: "ANNUAL",
      startDate: "2026-08-05",
      endDate: "2026-08-01",
    });
    expect(bad.success).toBe(false);
  });

  it("createLeaveSchema accepts a valid range", () => {
    const ok = createLeaveSchema.safeParse({
      employeeProfileId: CUID,
      type: "SICK",
      startDate: "2026-08-01",
      endDate: "2026-08-03",
    });
    expect(ok.success).toBe(true);
  });

  it("reviewLeaveSchema only allows APPROVED/REJECTED", () => {
    expect(reviewLeaveSchema.safeParse({ status: "APPROVED" }).success).toBe(true);
    expect(reviewLeaveSchema.safeParse({ status: "PENDING" }).success).toBe(false);
  });
});

describe("HR — payroll validators", () => {
  it("generatePayrollSchema requires periodStart <= periodEnd", () => {
    expect(
      generatePayrollSchema.safeParse({ periodStart: "2026-07-31", periodEnd: "2026-07-01" }).success,
    ).toBe(false);
    expect(
      generatePayrollSchema.safeParse({ periodStart: "2026-07-01", periodEnd: "2026-07-31" }).success,
    ).toBe(true);
  });

  it("upsertSalaryComponentSchema validates type + non-negative amount", () => {
    expect(
      upsertSalaryComponentSchema.safeParse({
        employeeProfileId: CUID,
        type: "ALLOWANCE",
        label: "بدل",
        amount: 500,
      }).success,
    ).toBe(true);
    expect(
      upsertSalaryComponentSchema.safeParse({
        employeeProfileId: CUID,
        type: "WRONG",
        label: "x",
        amount: 500,
      }).success,
    ).toBe(false);
  });
});

describe("HR — attendance validators", () => {
  it("clockActionSchema requires a cuid employeeProfileId", () => {
    expect(clockActionSchema.safeParse({ employeeProfileId: "not-a-cuid" }).success).toBe(false);
    expect(clockActionSchema.safeParse({ employeeProfileId: CUID }).success).toBe(true);
  });
});
