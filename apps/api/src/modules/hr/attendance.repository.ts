import type {
  AttendanceRecord,
  AttendanceStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

export type AttendanceWithEmployee = AttendanceRecord & {
  employee: { id: string; user: { name: string; email: string } };
};

const employeeInclude = {
  employee: { select: { id: true, user: { select: { name: true, email: true } } } },
} as const;

export class AttendanceRepository {
  constructor(private readonly db: PrismaClient) {}

  employeeExists(id: string): Promise<{ id: string } | null> {
    return this.db.employeeProfile.findUnique({ where: { id }, select: { id: true } });
  }

  findForDate(employeeProfileId: string, workDate: Date): Promise<AttendanceRecord | null> {
    return this.db.attendanceRecord.findUnique({
      where: { employeeProfileId_workDate: { employeeProfileId, workDate } },
    });
  }

  findById(id: string): Promise<AttendanceWithEmployee | null> {
    return this.db.attendanceRecord.findUnique({ where: { id }, include: employeeInclude });
  }

  create(data: Prisma.AttendanceRecordUncheckedCreateInput): Promise<AttendanceWithEmployee> {
    return this.db.attendanceRecord.create({ data, include: employeeInclude });
  }

  update(id: string, data: Prisma.AttendanceRecordUpdateInput): Promise<AttendanceWithEmployee> {
    return this.db.attendanceRecord.update({ where: { id }, data, include: employeeInclude });
  }

  upsertCorrection(
    employeeProfileId: string,
    workDate: Date,
    data: Prisma.AttendanceRecordUncheckedCreateInput,
    update: Prisma.AttendanceRecordUpdateInput,
  ): Promise<AttendanceWithEmployee> {
    return this.db.attendanceRecord.upsert({
      where: { employeeProfileId_workDate: { employeeProfileId, workDate } },
      create: data,
      update,
      include: employeeInclude,
    });
  }

  async list(params: {
    skip: number;
    take: number;
    employeeProfileId?: string;
    status?: AttendanceStatus;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ rows: AttendanceWithEmployee[]; total: number }> {
    const where: Prisma.AttendanceRecordWhereInput = {};
    if (params.employeeProfileId) where.employeeProfileId = params.employeeProfileId;
    if (params.status) where.status = params.status;
    if (params.dateFrom || params.dateTo) {
      where.workDate = {};
      if (params.dateFrom) where.workDate.gte = params.dateFrom;
      if (params.dateTo) where.workDate.lte = params.dateTo;
    }
    const [rows, total] = await Promise.all([
      this.db.attendanceRecord.findMany({
        where,
        include: employeeInclude,
        orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
        skip: params.skip,
        take: params.take,
      }),
      this.db.attendanceRecord.count({ where }),
    ]);
    return { rows, total };
  }

  /** ملخص حضور نافذة (لإغلاق اليوم/التقارير): عدد الحضور وإجمالي دقائق الإضافي */
  async summary(dateFrom: Date, dateTo: Date): Promise<{ present: number; overtimeMinutes: number }> {
    const [presentAgg, otAgg] = await Promise.all([
      this.db.attendanceRecord.count({
        where: { workDate: { gte: dateFrom, lte: dateTo }, status: { in: ["PRESENT", "LATE", "HALF_DAY"] } },
      }),
      this.db.attendanceRecord.aggregate({
        where: { workDate: { gte: dateFrom, lte: dateTo } },
        _sum: { overtimeMinutes: true },
      }),
    ]);
    return { present: presentAgg, overtimeMinutes: otAgg._sum.overtimeMinutes ?? 0 };
  }

  createAuditLog(entry: {
    action: Prisma.AuditLogUncheckedCreateInput["action"];
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Prisma.InputJsonValue;
  }): Promise<unknown> {
    return this.db.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        metadata: entry.metadata,
      },
    });
  }
}
