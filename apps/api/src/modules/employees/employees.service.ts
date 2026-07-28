import type { Prisma } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { AuthenticatedUser, RequestContext } from "../auth/index.js";
import type { EmployeeDocument } from "@prisma/client";
import type {
  ChangeEmployeeStatusDto,
  CreateDocumentDto,
  CreateEmployeeDto,
  ListEmployeesQueryDto,
  UpdateDocumentDto,
  UpdateEmployeeDto,
} from "./employees.dto.js";
import type { DocumentWithEmployee, EmployeesRepository } from "./employees.repository.js";
import type {
  EmployeeDocumentView,
  EmployeeStats,
  EmployeeView,
  EmployeeWithUser,
  ListEmployeesResult,
} from "./employees.types.js";

/** عتبة تنبيه قرب انتهاء مستند (بالأيام) */
const DOC_EXPIRY_WARN_DAYS = 30;

export class EmployeesService {
  constructor(private readonly repo: EmployeesRepository) {}

  async list(query: ListEmployeesQueryDto): Promise<ListEmployeesResult> {
    const { page, limit } = query;
    const { rows, total } = await this.repo.list({
      skip: (page - 1) * limit,
      take: limit,
      search: query.search,
      status: query.status,
      department: query.department,
    });
    return { employees: rows.map((r) => this.toView(r)), meta: this.meta(page, limit, total) };
  }

  async getById(id: string): Promise<EmployeeView> {
    const row = await this.repo.findById(id);
    if (!row) throw new ApiError(404, "ملف الموظف غير موجود");
    return this.toView(row);
  }

  async getByUserId(userId: string): Promise<EmployeeView | null> {
    const row = await this.repo.findByUserId(userId);
    return row ? this.toView(row) : null;
  }

  async stats(): Promise<EmployeeStats> {
    return this.repo.stats();
  }

  async create(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    dto: CreateEmployeeDto,
  ): Promise<EmployeeView> {
    const user = await this.repo.userExists(dto.userId);
    if (!user) throw new ApiError(404, "المستخدم غير موجود");

    const existing = await this.repo.findByUserId(dto.userId);
    if (existing) throw new ApiError(409, "يوجد ملف موظف لهذا المستخدم بالفعل");

    if (dto.employeeCode) {
      const dupe = await this.repo.findByEmployeeCode(dto.employeeCode);
      if (dupe) throw new ApiError(409, "الرقم الوظيفي مستخدم بالفعل");
    }

    const { userId, ...fields } = dto;
    const row = await this.repo.create({
      ...fields,
      user: { connect: { id: userId } },
    });

    await this.audit(actor, ctx, row.id, { event: "created", userId });
    return this.toView(row);
  }

  async update(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    id: string,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeeView> {
    const current = await this.repo.findById(id);
    if (!current) throw new ApiError(404, "ملف الموظف غير موجود");

    if (dto.employeeCode && dto.employeeCode !== current.employeeCode) {
      const dupe = await this.repo.findByEmployeeCode(dto.employeeCode);
      if (dupe && dupe.id !== id) throw new ApiError(409, "الرقم الوظيفي مستخدم بالفعل");
    }

    const row = await this.repo.update(id, dto as Prisma.EmployeeProfileUpdateInput);
    await this.audit(actor, ctx, id, { event: "updated", fields: Object.keys(dto) });
    return this.toView(row);
  }

  /** تغيير حالة التوظيف - الإنهاء يضبط terminatedAt، والإرجاع لـ ACTIVE يمسحه */
  async changeStatus(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    id: string,
    dto: ChangeEmployeeStatusDto,
  ): Promise<EmployeeView> {
    const current = await this.repo.findById(id);
    if (!current) throw new ApiError(404, "ملف الموظف غير موجود");

    const data: Prisma.EmployeeProfileUpdateInput = { status: dto.status };
    if (dto.status === "TERMINATED") {
      data.terminatedAt = current.terminatedAt ?? new Date();
    } else if (dto.status === "ACTIVE") {
      data.terminatedAt = null;
    }

    const row = await this.repo.update(id, data);
    await this.audit(actor, ctx, id, {
      event: "status_changed",
      status: dto.status,
      reason: dto.reason ?? null,
    });
    return this.toView(row);
  }

  // ==================== Documents (Phase 9.6b) ====================

  async listDocuments(employeeProfileId: string): Promise<EmployeeDocumentView[]> {
    const employee = await this.repo.findById(employeeProfileId);
    if (!employee) throw new ApiError(404, "ملف الموظف غير موجود");
    const rows = await this.repo.listDocuments(employeeProfileId);
    return rows.map((d) => this.toDocView(d));
  }

  async createDocument(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    employeeProfileId: string,
    dto: CreateDocumentDto,
  ): Promise<EmployeeDocumentView> {
    const employee = await this.repo.findById(employeeProfileId);
    if (!employee) throw new ApiError(404, "ملف الموظف غير موجود");
    const row = await this.repo.createDocument({
      employeeProfileId,
      type: dto.type,
      name: dto.name,
      number: dto.number ?? null,
      url: dto.url ?? null,
      issueDate: dto.issueDate ?? null,
      expiryDate: dto.expiryDate ?? null,
      note: dto.note ?? null,
    });
    await this.auditDoc(actor, ctx, row.id, { event: "created", employeeProfileId });
    return this.toDocView(row);
  }

  async updateDocument(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    id: string,
    dto: UpdateDocumentDto,
  ): Promise<EmployeeDocumentView> {
    const existing = await this.repo.documentById(id);
    if (!existing) throw new ApiError(404, "المستند غير موجود");
    const row = await this.repo.updateDocument(id, {
      type: dto.type,
      name: dto.name,
      number: dto.number,
      url: dto.url,
      issueDate: dto.issueDate,
      expiryDate: dto.expiryDate,
      note: dto.note,
    });
    await this.auditDoc(actor, ctx, id, { event: "updated" });
    return this.toDocView(row);
  }

  async deleteDocument(actor: AuthenticatedUser, ctx: RequestContext, id: string): Promise<void> {
    const existing = await this.repo.documentById(id);
    if (!existing) throw new ApiError(404, "المستند غير موجود");
    await this.repo.deleteDocument(id);
    await this.auditDoc(actor, ctx, id, { event: "deleted" });
  }

  async expiringDocuments(withinDays: number): Promise<EmployeeDocumentView[]> {
    const before = new Date(Date.now() + withinDays * 86_400_000);
    const rows = await this.repo.expiringDocuments(before);
    return rows.map((d) => this.toDocView(d, d.employee.user.name));
  }

  private toDocView(row: EmployeeDocument | DocumentWithEmployee, employeeName?: string): EmployeeDocumentView {
    const now = Date.now();
    const expiry = row.expiryDate ? row.expiryDate.getTime() : null;
    const expired = expiry !== null && expiry < now;
    const expiringSoon =
      expiry !== null && !expired && expiry <= now + DOC_EXPIRY_WARN_DAYS * 86_400_000;
    return {
      id: row.id,
      employeeProfileId: row.employeeProfileId,
      type: row.type,
      name: row.name,
      number: row.number,
      url: row.url,
      issueDate: row.issueDate?.toISOString() ?? null,
      expiryDate: row.expiryDate?.toISOString() ?? null,
      expiringSoon,
      expired,
      ...(employeeName ? { employeeName } : {}),
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async auditDoc(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    documentId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.createAuditLog({
      action: "EMPLOYEE_DOCUMENT_UPDATED",
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { documentId, ...metadata } as Prisma.InputJsonValue,
    });
  }

  // ==================== مساعدات ====================

  private toView(row: EmployeeWithUser): EmployeeView {
    return {
      id: row.id,
      userId: row.userId,
      user: {
        name: row.user.name,
        email: row.user.email,
        role: row.user.role,
        isActive: row.user.isActive,
        phone: row.user.phone,
        branchId: row.user.branchId,
      },
      employeeCode: row.employeeCode,
      jobTitle: row.jobTitle,
      department: row.department,
      employmentType: row.employmentType,
      status: row.status,
      hireDate: row.hireDate?.toISOString() ?? null,
      terminatedAt: row.terminatedAt?.toISOString() ?? null,
      nationalId: row.nationalId,
      personalPhone: row.personalPhone,
      personalEmail: row.personalEmail,
      address: row.address,
      emergencyName: row.emergencyName,
      emergencyPhone: row.emergencyPhone,
      baseSalary: row.baseSalary?.toNumber() ?? null,
      contractUrl: row.contractUrl,
      idCardUrl: row.idCardUrl,
      photoUrl: row.photoUrl,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private meta(page: number, limit: number, total: number) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
  }

  private async audit(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    employeeId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.createAuditLog({
      action: "EMPLOYEE_UPDATED",
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { employeeId, ...metadata } as Prisma.InputJsonValue,
    });
  }
}
