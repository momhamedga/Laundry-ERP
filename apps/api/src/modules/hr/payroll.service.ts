import type { Prisma } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { AuthenticatedUser, RequestContext } from "../auth/index.js";
import { STANDARD_WORK_HOURS, toDateOnly } from "./hr.constants.js";
import type { GeneratePayrollDto, ListPayrollQueryDto, UpsertSalaryComponentDto } from "./hr.dto.js";
import type { PayrollRepository } from "./payroll.repository.js";
import { AR_LOCALE } from "../../constants/locale.js";
import type {
  PaginationMeta,
  PayrollRunView,
  PayslipView,
  SalaryComponentView,
} from "./hr.types.js";

/** أيام العمل الشهرية القياسية لاشتقاق المعدّل اليومي/الساعي (افتراض موثّق - راجع القيود) */
const WORKING_DAYS_PER_MONTH = 26;
/** معامل أجر العمل الإضافي */
const OVERTIME_MULTIPLIER = 1.5;

export class PayrollService {
  constructor(private readonly repo: PayrollRepository) {}

  /** توليد دورة رواتب (مسودة) لكل موظف نشط - يحسب القسائم من الراتب+المكوّنات+الحضور */
  async generate(actor: AuthenticatedUser, ctx: RequestContext, dto: GeneratePayrollDto): Promise<PayrollRunView> {
    const periodStart = toDateOnly(dto.periodStart);
    const periodEnd = toDateOnly(dto.periodEnd);

    const existing = await this.repo.findByPeriod(periodStart, periodEnd);
    if (existing) throw new ApiError(409, "توجد دورة رواتب لهذه الفترة بالفعل");

    const [employees, attendance] = await Promise.all([
      this.repo.activeEmployees(),
      this.repo.attendanceForPeriod(periodStart, periodEnd),
    ]);
    if (employees.length === 0) throw new ApiError(400, "لا يوجد موظفون نشطون لتوليد رواتبهم");

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const payslips: Prisma.PayslipUncheckedCreateWithoutRunInput[] = employees.map((emp) => {
      const base = emp.baseSalary?.toNumber() ?? 0;
      const allowances = sumComponents(emp.salaryComponents, "ALLOWANCE");
      const bonuses = sumComponents(emp.salaryComponents, "BONUS");
      const componentDeductions = sumComponents(emp.salaryComponents, "DEDUCTION");

      const att = attendance.get(emp.id) ?? { overtimeMinutes: 0, absentDays: 0, leaveDays: 0 };
      const overtimeHours = round2(att.overtimeMinutes / 60);
      const hourlyRate = base / (WORKING_DAYS_PER_MONTH * STANDARD_WORK_HOURS);
      const dailyRate = base / WORKING_DAYS_PER_MONTH;
      const overtimePay = round2(overtimeHours * hourlyRate * OVERTIME_MULTIPLIER);
      const absenceDeduction = round2(att.absentDays * dailyRate);

      const deductions = round2(componentDeductions + absenceDeduction);
      const gross = round2(base + allowances + bonuses + overtimePay);
      const net = round2(gross - deductions);

      totalGross += gross;
      totalDeductions += deductions;
      totalNet += net;

      return {
        employeeProfileId: emp.id,
        baseSalary: base,
        allowances,
        bonuses,
        overtimePay,
        deductions,
        netSalary: net,
        workedDays: 0,
        absentDays: att.absentDays,
        leaveDays: att.leaveDays,
        overtimeHours,
      };
    });

    const label = dto.label ?? defaultLabel(periodStart);
    const run = await this.repo.createRunWithPayslips(
      {
        periodStart,
        periodEnd,
        label,
        status: "DRAFT",
        totalGross: round2(totalGross),
        totalDeductions: round2(totalDeductions),
        totalNet: round2(totalNet),
        generatedById: actor.id,
      },
      payslips,
    );

    await this.audit(actor, ctx, "PAYROLL_GENERATED", run.id, { label, employees: employees.length, totalNet: round2(totalNet) });
    return this.runView({ ...run, _count: { payslips: payslips.length } });
  }

  async approve(actor: AuthenticatedUser, ctx: RequestContext, id: string): Promise<PayrollRunView> {
    const run = await this.repo.findRun(id);
    if (!run) throw new ApiError(404, "دورة الرواتب غير موجودة");
    if (run.status !== "DRAFT") throw new ApiError(409, "لا يمكن اعتماد دورة غير مسودة");
    const updated = await this.repo.updateRun(id, {
      status: "APPROVED",
      approvedById: actor.id,
      approvedAt: new Date(),
    });
    await this.audit(actor, ctx, "PAYROLL_APPROVED", id, {});
    const payslips = await this.repo.payslipsFor(id);
    return this.runView({ ...updated, _count: { payslips: payslips.length } });
  }

  async list(query: ListPayrollQueryDto): Promise<{ runs: PayrollRunView[]; meta: PaginationMeta }> {
    const { page, limit } = query;
    const { rows, total } = await this.repo.listRuns({
      skip: (page - 1) * limit,
      take: limit,
      status: query.status,
    });
    return { runs: rows.map((r) => this.runView(r)), meta: meta(page, limit, total) };
  }

  async getRun(id: string): Promise<{ run: PayrollRunView; payslips: PayslipView[] }> {
    const run = await this.repo.findRun(id);
    if (!run) throw new ApiError(404, "دورة الرواتب غير موجودة");
    const payslips = await this.repo.payslipsFor(id);
    return {
      run: this.runView({ ...run, _count: { payslips: payslips.length } }),
      payslips: payslips.map((p) => ({
        id: p.id,
        payrollRunId: p.payrollRunId,
        employeeProfileId: p.employeeProfileId,
        employeeName: p.employee.user.name,
        baseSalary: p.baseSalary.toNumber(),
        allowances: p.allowances.toNumber(),
        bonuses: p.bonuses.toNumber(),
        overtimePay: p.overtimePay.toNumber(),
        deductions: p.deductions.toNumber(),
        netSalary: p.netSalary.toNumber(),
        workedDays: p.workedDays,
        absentDays: p.absentDays,
        leaveDays: p.leaveDays,
        overtimeHours: p.overtimeHours.toNumber(),
        note: p.note,
      })),
    };
  }

  // ---- Salary components ----

  async components(employeeProfileId: string): Promise<SalaryComponentView[]> {
    const rows = await this.repo.componentsFor(employeeProfileId);
    return rows.map(componentView);
  }

  async upsertComponent(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    dto: UpsertSalaryComponentDto,
    id?: string,
  ): Promise<SalaryComponentView> {
    let row;
    if (id) {
      const existing = await this.repo.componentById(id);
      if (!existing) throw new ApiError(404, "المكوّن غير موجود");
      row = await this.repo.updateComponent(id, {
        type: dto.type,
        label: dto.label,
        amount: dto.amount,
        isActive: dto.isActive ?? existing.isActive,
      });
    } else {
      row = await this.repo.createComponent({
        employeeProfileId: dto.employeeProfileId,
        type: dto.type,
        label: dto.label,
        amount: dto.amount,
        isActive: dto.isActive ?? true,
      });
    }
    await this.audit(actor, ctx, "PAYROLL_GENERATED", row.id, { event: "component_upsert" });
    return componentView(row);
  }

  async deleteComponent(actor: AuthenticatedUser, ctx: RequestContext, id: string): Promise<void> {
    const existing = await this.repo.componentById(id);
    if (!existing) throw new ApiError(404, "المكوّن غير موجود");
    await this.repo.deleteComponent(id);
    await this.audit(actor, ctx, "PAYROLL_GENERATED", id, { event: "component_delete" });
  }

  // ---- helpers ----

  private runView(r: { id: string; periodStart: Date; periodEnd: Date; label: string; status: PayrollRunView["status"]; totalGross: Prisma.Decimal; totalDeductions: Prisma.Decimal; totalNet: Prisma.Decimal; approvedAt: Date | null; notes: string | null; createdAt: Date; _count: { payslips: number } }): PayrollRunView {
    return {
      id: r.id,
      periodStart: r.periodStart.toISOString().slice(0, 10),
      periodEnd: r.periodEnd.toISOString().slice(0, 10),
      label: r.label,
      status: r.status,
      totalGross: r.totalGross.toNumber(),
      totalDeductions: r.totalDeductions.toNumber(),
      totalNet: r.totalNet.toNumber(),
      approvedAt: r.approvedAt?.toISOString() ?? null,
      notes: r.notes,
      payslipCount: r._count.payslips,
      createdAt: r.createdAt.toISOString(),
    };
  }

  private async audit(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    action: "PAYROLL_GENERATED" | "PAYROLL_APPROVED",
    entityId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.createAuditLog({
      action,
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { entityId, ...metadata } as Prisma.InputJsonValue,
    });
  }
}

function sumComponents(components: { type: string; amount: Prisma.Decimal }[], type: string): number {
  return round2(
    components.filter((c) => c.type === type).reduce((sum, c) => sum + c.amount.toNumber(), 0),
  );
}

function componentView(c: { id: string; employeeProfileId: string; type: SalaryComponentView["type"]; label: string; amount: Prisma.Decimal; isActive: boolean }): SalaryComponentView {
  return {
    id: c.id,
    employeeProfileId: c.employeeProfileId,
    type: c.type,
    label: c.label,
    amount: c.amount.toNumber(),
    isActive: c.isActive,
  };
}

function defaultLabel(periodStart: Date): string {
  return new Intl.DateTimeFormat(AR_LOCALE, { year: "numeric", month: "long" }).format(periodStart);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function meta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}
