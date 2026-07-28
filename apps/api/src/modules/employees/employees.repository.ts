import type {
  AuditAction,
  EmployeeDocument,
  EmploymentStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import type { EmployeeStats, EmployeeWithUser } from "./employees.types.js";

export type DocumentWithEmployee = EmployeeDocument & {
  employee: { user: { name: string } };
};

const userSelect = {
  select: { name: true, email: true, role: true, isActive: true, phone: true, branchId: true },
} as const;

export class EmployeesRepository {
  constructor(private readonly db: PrismaClient) {}

  findById(id: string): Promise<EmployeeWithUser | null> {
    return this.db.employeeProfile.findUnique({ where: { id }, include: { user: userSelect } });
  }

  findByUserId(userId: string): Promise<EmployeeWithUser | null> {
    return this.db.employeeProfile.findUnique({ where: { userId }, include: { user: userSelect } });
  }

  findByEmployeeCode(employeeCode: string): Promise<{ id: string } | null> {
    return this.db.employeeProfile.findUnique({ where: { employeeCode }, select: { id: true } });
  }

  userExists(userId: string): Promise<{ id: string } | null> {
    return this.db.user.findUnique({ where: { id: userId }, select: { id: true } });
  }

  create(data: Prisma.EmployeeProfileCreateInput): Promise<EmployeeWithUser> {
    return this.db.employeeProfile.create({ data, include: { user: userSelect } });
  }

  update(id: string, data: Prisma.EmployeeProfileUpdateInput): Promise<EmployeeWithUser> {
    return this.db.employeeProfile.update({ where: { id }, data, include: { user: userSelect } });
  }

  async list(params: {
    skip: number;
    take: number;
    search?: string;
    status?: EmploymentStatus;
    department?: string;
  }): Promise<{ rows: EmployeeWithUser[]; total: number }> {
    const where: Prisma.EmployeeProfileWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.department) where.department = params.department;
    if (params.search) {
      where.OR = [
        { jobTitle: { contains: params.search, mode: "insensitive" } },
        { employeeCode: { contains: params.search, mode: "insensitive" } },
        { department: { contains: params.search, mode: "insensitive" } },
        { user: { name: { contains: params.search, mode: "insensitive" } } },
        { user: { email: { contains: params.search, mode: "insensitive" } } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.db.employeeProfile.findMany({
        where,
        include: { user: userSelect },
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
      this.db.employeeProfile.count({ where }),
    ]);
    return { rows, total };
  }

  async stats(): Promise<EmployeeStats> {
    const [total, byStatusRaw, byTypeRaw, departmentsRaw] = await Promise.all([
      this.db.employeeProfile.count(),
      this.db.employeeProfile.groupBy({ by: ["status"], _count: { _all: true } }),
      this.db.employeeProfile.groupBy({ by: ["employmentType"], _count: { _all: true } }),
      this.db.employeeProfile.findMany({
        where: { department: { not: null } },
        distinct: ["department"],
        select: { department: true },
      }),
    ]);

    const byStatus: EmployeeStats["byStatus"] = {
      ACTIVE: 0,
      SUSPENDED: 0,
      TERMINATED: 0,
      ARCHIVED: 0,
    };
    for (const r of byStatusRaw) byStatus[r.status] = r._count._all;

    const byType: EmployeeStats["byType"] = {
      FULL_TIME: 0,
      PART_TIME: 0,
      CONTRACT: 0,
      TEMPORARY: 0,
    };
    for (const r of byTypeRaw) byType[r.employmentType] = r._count._all;

    return { total, byStatus, byType, departments: departmentsRaw.length };
  }

  // ==================== Documents (Phase 9.6b) ====================

  listDocuments(employeeProfileId: string): Promise<EmployeeDocument[]> {
    return this.db.employeeDocument.findMany({
      where: { employeeProfileId },
      orderBy: { createdAt: "desc" },
    });
  }

  documentById(id: string): Promise<EmployeeDocument | null> {
    return this.db.employeeDocument.findUnique({ where: { id } });
  }

  createDocument(data: Prisma.EmployeeDocumentUncheckedCreateInput): Promise<EmployeeDocument> {
    return this.db.employeeDocument.create({ data });
  }

  updateDocument(id: string, data: Prisma.EmployeeDocumentUpdateInput): Promise<EmployeeDocument> {
    return this.db.employeeDocument.update({ where: { id }, data });
  }

  deleteDocument(id: string): Promise<unknown> {
    return this.db.employeeDocument.delete({ where: { id } });
  }

  /** مستندات تنتهي خلال المدة (أو منتهية) - لتنبيهات الصلاحية */
  expiringDocuments(before: Date): Promise<DocumentWithEmployee[]> {
    return this.db.employeeDocument.findMany({
      where: { expiryDate: { not: null, lte: before } },
      include: { employee: { select: { user: { select: { name: true } } } } },
      orderBy: { expiryDate: "asc" },
    });
  }

  createAuditLog(entry: {
    action: AuditAction;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Prisma.InputJsonValue;
  }): Promise<unknown> {
    return this.db.auditLog.create({ data: entry });
  }
}
