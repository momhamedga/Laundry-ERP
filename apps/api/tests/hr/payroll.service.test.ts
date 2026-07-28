import { describe, expect, it, vi } from "vitest";
import { PayrollService } from "../../src/modules/hr/payroll.service";
import type { PayrollRepository } from "../../src/modules/hr/payroll.repository";
import type { AuthenticatedUser, RequestContext } from "../../src/modules/auth/index";

const actor: AuthenticatedUser = { id: "admin1", email: "a@b.c", role: "ADMIN", branchId: null };
const ctx: RequestContext = { ipAddress: "127.0.0.1", userAgent: "test" };

/** يحاكي Prisma.Decimal بأقلّ قدر (toNumber فقط - وهو ما تستهلكه الخدمة) */
const dec = (n: number) => ({ toNumber: () => n }) as unknown as import("@prisma/client").Prisma.Decimal;

function buildRepo(overrides: Partial<PayrollRepository>): {
  repo: PayrollRepository;
  captured: { payslips?: readonly Record<string, unknown>[]; run?: Record<string, unknown> };
} {
  const captured: { payslips?: readonly Record<string, unknown>[]; run?: Record<string, unknown> } = {};
  const base: Partial<PayrollRepository> = {
    findByPeriod: vi.fn(async () => null),
    attendanceForPeriod: vi.fn(async () => new Map()),
    createAuditLog: vi.fn(async () => undefined),
    createRunWithPayslips: vi.fn(async (run: Record<string, unknown>, payslips: readonly Record<string, unknown>[]) => {
      captured.run = run;
      captured.payslips = payslips;
      return {
        ...run,
        id: "run1",
        createdAt: new Date("2026-07-31T00:00:00Z"),
        approvedAt: null,
        notes: null,
        periodStart: new Date(run.periodStart as string),
        periodEnd: new Date(run.periodEnd as string),
        totalGross: dec(run.totalGross as number),
        totalDeductions: dec(run.totalDeductions as number),
        totalNet: dec(run.totalNet as number),
      };
    }) as unknown as PayrollRepository["createRunWithPayslips"],
    ...overrides,
  };
  return { repo: base as PayrollRepository, captured };
}

describe("PayrollService.generate — salary computation (Phase 9.6b)", () => {
  it("net = base + allowances + bonuses + overtimePay − (deductions + absence)", async () => {
    const { repo, captured } = buildRepo({
      activeEmployees: vi.fn(async () => [
        {
          id: "emp1",
          baseSalary: dec(6000),
          user: { name: "موظف" },
          salaryComponents: [
            { type: "ALLOWANCE", amount: dec(500) },
            { type: "DEDUCTION", amount: dec(200) },
          ],
        },
      ]) as unknown as PayrollRepository["activeEmployees"],
    });
    const svc = new PayrollService(repo);
    await svc.generate(actor, ctx, { periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-07-31") });

    const slip = captured.payslips?.[0] as Record<string, number>;
    expect(slip.baseSalary).toBe(6000);
    expect(slip.allowances).toBe(500);
    expect(slip.deductions).toBe(200);
    expect(slip.netSalary).toBe(6300); // 6000 + 500 − 200
    expect(captured.run?.totalGross).toBe(6500);
    expect(captured.run?.totalNet).toBe(6300);
  });

  it("adds overtime pay (×1.5) from attendance minutes", async () => {
    const { repo, captured } = buildRepo({
      activeEmployees: vi.fn(async () => [
        { id: "emp1", baseSalary: dec(5200), user: { name: "x" }, salaryComponents: [] },
      ]) as unknown as PayrollRepository["activeEmployees"],
      // 60 دقيقة إضافي → ساعة واحدة
      attendanceForPeriod: vi.fn(
        async () => new Map([["emp1", { overtimeMinutes: 60, absentDays: 0, leaveDays: 0 }]]),
      ) as unknown as PayrollRepository["attendanceForPeriod"],
    });
    const svc = new PayrollService(repo);
    await svc.generate(actor, ctx, { periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-07-31") });

    const slip = captured.payslips?.[0] as Record<string, number>;
    // hourly = 5200 / (26*8) = 25 ⇒ overtime = 1h × 25 × 1.5 = 37.5
    expect(slip.overtimeHours).toBe(1);
    expect(slip.overtimePay).toBe(37.5);
    expect(slip.netSalary).toBe(5237.5);
  });

  it("rejects a period that already has a payroll run", async () => {
    const { repo } = buildRepo({
      findByPeriod: vi.fn(async () => ({ id: "existing" })) as unknown as PayrollRepository["findByPeriod"],
    });
    const svc = new PayrollService(repo);
    await expect(
      svc.generate(actor, ctx, { periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-07-31") }),
    ).rejects.toThrow();
  });

  it("rejects when there are no active employees", async () => {
    const { repo } = buildRepo({
      activeEmployees: vi.fn(async () => []) as unknown as PayrollRepository["activeEmployees"],
    });
    const svc = new PayrollService(repo);
    await expect(
      svc.generate(actor, ctx, { periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-07-31") }),
    ).rejects.toThrow();
  });
});
