import type {
  PayrollRun,
  PayrollStatus,
  Payslip,
  Prisma,
  PrismaClient,
  SalaryComponent,
} from "@prisma/client";

export type PayrollEmployee = {
  id: string;
  baseSalary: Prisma.Decimal | null;
  user: { name: string };
  salaryComponents: SalaryComponent[];
};

export type PayslipWithEmployee = Payslip & { employee: { id: string; user: { name: string } } };

export class PayrollRepository {
  constructor(private readonly db: PrismaClient) {}

  /** الموظفون النشطون (حالة توظيف ACTIVE + مستخدم مفعّل) مع مكوّنات الراتب الفعّالة */
  activeEmployees(): Promise<PayrollEmployee[]> {
    return this.db.employeeProfile.findMany({
      where: { status: "ACTIVE", user: { isActive: true } },
      select: {
        id: true,
        baseSalary: true,
        user: { select: { name: true } },
        salaryComponents: { where: { isActive: true } },
      },
    });
  }

  /** تجميع الحضور لفترة لكل موظف: دقائق إضافي، أيام غياب، أيام إجازة */
  async attendanceForPeriod(
    from: Date,
    to: Date,
  ): Promise<Map<string, { overtimeMinutes: number; absentDays: number; leaveDays: number }>> {
    const rows = await this.db.attendanceRecord.groupBy({
      by: ["employeeProfileId", "status"],
      where: { workDate: { gte: from, lte: to } },
      _sum: { overtimeMinutes: true },
      _count: { _all: true },
    });
    const map = new Map<string, { overtimeMinutes: number; absentDays: number; leaveDays: number }>();
    for (const r of rows) {
      const cur = map.get(r.employeeProfileId) ?? { overtimeMinutes: 0, absentDays: 0, leaveDays: 0 };
      cur.overtimeMinutes += r._sum.overtimeMinutes ?? 0;
      if (r.status === "ABSENT") cur.absentDays += r._count._all;
      if (r.status === "ON_LEAVE") cur.leaveDays += r._count._all;
      map.set(r.employeeProfileId, cur);
    }
    return map;
  }

  findByPeriod(periodStart: Date, periodEnd: Date): Promise<PayrollRun | null> {
    return this.db.payrollRun.findUnique({
      where: { periodStart_periodEnd: { periodStart, periodEnd } },
    });
  }

  findRun(id: string): Promise<PayrollRun | null> {
    return this.db.payrollRun.findUnique({ where: { id } });
  }

  payslipsFor(runId: string): Promise<PayslipWithEmployee[]> {
    return this.db.payslip.findMany({
      where: { payrollRunId: runId },
      include: { employee: { select: { id: true, user: { select: { name: true } } } } },
      orderBy: { netSalary: "desc" },
    });
  }

  /** إنشاء دورة + قسائمها في معاملة واحدة */
  async createRunWithPayslips(
    run: Prisma.PayrollRunUncheckedCreateInput,
    payslips: Prisma.PayslipUncheckedCreateWithoutRunInput[],
  ): Promise<PayrollRun> {
    return this.db.payrollRun.create({
      data: { ...run, payslips: { create: payslips } },
    });
  }

  updateRun(id: string, data: Prisma.PayrollRunUpdateInput): Promise<PayrollRun> {
    return this.db.payrollRun.update({ where: { id }, data });
  }

  async listRuns(params: {
    skip: number;
    take: number;
    status?: PayrollStatus;
  }): Promise<{ rows: (PayrollRun & { _count: { payslips: number } })[]; total: number }> {
    const where: Prisma.PayrollRunWhereInput = {};
    if (params.status) where.status = params.status;
    const [rows, total] = await Promise.all([
      this.db.payrollRun.findMany({
        where,
        include: { _count: { select: { payslips: true } } },
        orderBy: { periodStart: "desc" },
        skip: params.skip,
        take: params.take,
      }),
      this.db.payrollRun.count({ where }),
    ]);
    return { rows, total };
  }

  // ---- Salary components ----

  componentsFor(employeeProfileId: string): Promise<SalaryComponent[]> {
    return this.db.salaryComponent.findMany({ where: { employeeProfileId }, orderBy: { createdAt: "asc" } });
  }

  createComponent(data: Prisma.SalaryComponentUncheckedCreateInput): Promise<SalaryComponent> {
    return this.db.salaryComponent.create({ data });
  }

  updateComponent(id: string, data: Prisma.SalaryComponentUpdateInput): Promise<SalaryComponent> {
    return this.db.salaryComponent.update({ where: { id }, data });
  }

  deleteComponent(id: string): Promise<unknown> {
    return this.db.salaryComponent.delete({ where: { id } });
  }

  componentById(id: string): Promise<SalaryComponent | null> {
    return this.db.salaryComponent.findUnique({ where: { id } });
  }

  createAuditLog(entry: {
    action: Prisma.AuditLogUncheckedCreateInput["action"];
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Prisma.InputJsonValue;
  }): Promise<unknown> {
    return this.db.auditLog.create({ data: entry });
  }
}
