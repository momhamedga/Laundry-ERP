import type {
  LeaveBalance,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  Prisma,
  PrismaClient,
} from "@prisma/client";

export type LeaveWithEmployee = LeaveRequest & {
  employee: { id: string; user: { name: string } };
};

const employeeInclude = {
  employee: { select: { id: true, user: { select: { name: true } } } },
} as const;

export class LeavesRepository {
  constructor(private readonly db: PrismaClient) {}

  employeeExists(id: string): Promise<{ id: string } | null> {
    return this.db.employeeProfile.findUnique({ where: { id }, select: { id: true } });
  }

  findById(id: string): Promise<LeaveWithEmployee | null> {
    return this.db.leaveRequest.findUnique({ where: { id }, include: employeeInclude });
  }

  create(data: Prisma.LeaveRequestUncheckedCreateInput): Promise<LeaveWithEmployee> {
    return this.db.leaveRequest.create({ data, include: employeeInclude });
  }

  update(id: string, data: Prisma.LeaveRequestUpdateInput): Promise<LeaveWithEmployee> {
    return this.db.leaveRequest.update({ where: { id }, data, include: employeeInclude });
  }

  async list(params: {
    skip: number;
    take: number;
    employeeProfileId?: string;
    status?: LeaveStatus;
    type?: LeaveType;
  }): Promise<{ rows: LeaveWithEmployee[]; total: number }> {
    const where: Prisma.LeaveRequestWhereInput = {};
    if (params.employeeProfileId) where.employeeProfileId = params.employeeProfileId;
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;
    const [rows, total] = await Promise.all([
      this.db.leaveRequest.findMany({
        where,
        include: employeeInclude,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
      this.db.leaveRequest.count({ where }),
    ]);
    return { rows, total };
  }

  // ---- Balances ----

  balancesFor(employeeProfileId: string): Promise<LeaveBalance[]> {
    return this.db.leaveBalance.findMany({
      where: { employeeProfileId },
      orderBy: [{ year: "desc" }, { type: "asc" }],
    });
  }

  findBalance(employeeProfileId: string, type: LeaveType, year: number): Promise<LeaveBalance | null> {
    return this.db.leaveBalance.findUnique({
      where: { employeeProfileId_type_year: { employeeProfileId, type, year } },
    });
  }

  upsertBalance(
    employeeProfileId: string,
    type: LeaveType,
    year: number,
    entitledDays: number,
  ): Promise<LeaveBalance> {
    return this.db.leaveBalance.upsert({
      where: { employeeProfileId_type_year: { employeeProfileId, type, year } },
      create: { employeeProfileId, type, year, entitledDays },
      update: { entitledDays },
    });
  }

  incrementUsed(employeeProfileId: string, type: LeaveType, year: number, days: number): Promise<unknown> {
    return this.db.leaveBalance.upsert({
      where: { employeeProfileId_type_year: { employeeProfileId, type, year } },
      create: { employeeProfileId, type, year, usedDays: days },
      update: { usedDays: { increment: days } },
    });
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
