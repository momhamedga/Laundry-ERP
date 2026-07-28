import type { Prisma } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { AuthenticatedUser, RequestContext } from "../auth/index.js";
import { inclusiveDays, toDateOnly } from "./hr.constants.js";
import type { CreateLeaveDto, ListLeavesQueryDto, ReviewLeaveDto, UpsertLeaveBalanceDto } from "./hr.dto.js";
import type { LeavesRepository, LeaveWithEmployee } from "./leaves.repository.js";
import type { LeaveBalanceView, LeaveView, PaginationMeta } from "./hr.types.js";

export class LeavesService {
  constructor(private readonly repo: LeavesRepository) {}

  async create(actor: AuthenticatedUser, ctx: RequestContext, dto: CreateLeaveDto): Promise<LeaveView> {
    const emp = await this.repo.employeeExists(dto.employeeProfileId);
    if (!emp) throw new ApiError(404, "ملف الموظف غير موجود");

    const days = inclusiveDays(dto.startDate, dto.endDate);
    const row = await this.repo.create({
      employeeProfileId: dto.employeeProfileId,
      type: dto.type,
      startDate: toDateOnly(dto.startDate),
      endDate: toDateOnly(dto.endDate),
      days,
      reason: dto.reason ?? null,
      status: "PENDING",
    });
    await this.audit(actor, ctx, "LEAVE_REQUESTED", row.id, { type: dto.type, days });
    return this.toView(row);
  }

  async review(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    id: string,
    dto: ReviewLeaveDto,
  ): Promise<LeaveView> {
    const current = await this.repo.findById(id);
    if (!current) throw new ApiError(404, "طلب الإجازة غير موجود");
    if (current.status !== "PENDING") throw new ApiError(409, "تمت مراجعة هذا الطلب بالفعل");

    const row = await this.repo.update(id, {
      status: dto.status,
      reviewedById: actor.id,
      reviewedAt: new Date(),
      reviewNote: dto.reviewNote ?? null,
    });

    // خصم الرصيد عند الاعتماد (السنة من تاريخ البداية)
    if (dto.status === "APPROVED") {
      const year = current.startDate.getUTCFullYear();
      await this.repo.incrementUsed(current.employeeProfileId, current.type, year, current.days);
    }

    await this.audit(actor, ctx, "LEAVE_REVIEWED", id, { status: dto.status });
    return this.toView(row);
  }

  async cancel(actor: AuthenticatedUser, ctx: RequestContext, id: string): Promise<LeaveView> {
    const current = await this.repo.findById(id);
    if (!current) throw new ApiError(404, "طلب الإجازة غير موجود");
    if (current.status === "APPROVED") throw new ApiError(409, "لا يمكن إلغاء إجازة معتمدة");
    const row = await this.repo.update(id, { status: "CANCELLED" });
    await this.audit(actor, ctx, "LEAVE_REVIEWED", id, { status: "CANCELLED" });
    return this.toView(row);
  }

  async list(query: ListLeavesQueryDto): Promise<{ leaves: LeaveView[]; meta: PaginationMeta }> {
    const { page, limit } = query;
    const { rows, total } = await this.repo.list({
      skip: (page - 1) * limit,
      take: limit,
      employeeProfileId: query.employeeProfileId,
      status: query.status,
      type: query.type,
    });
    return { leaves: rows.map((r) => this.toView(r)), meta: meta(page, limit, total) };
  }

  async balances(employeeProfileId: string): Promise<LeaveBalanceView[]> {
    const rows = await this.repo.balancesFor(employeeProfileId);
    return rows.map((b) => ({
      id: b.id,
      employeeProfileId: b.employeeProfileId,
      type: b.type,
      year: b.year,
      entitledDays: b.entitledDays,
      usedDays: b.usedDays,
      remainingDays: b.entitledDays - b.usedDays,
    }));
  }

  async setBalance(actor: AuthenticatedUser, ctx: RequestContext, dto: UpsertLeaveBalanceDto): Promise<LeaveBalanceView> {
    const emp = await this.repo.employeeExists(dto.employeeProfileId);
    if (!emp) throw new ApiError(404, "ملف الموظف غير موجود");
    const b = await this.repo.upsertBalance(dto.employeeProfileId, dto.type, dto.year, dto.entitledDays);
    await this.audit(actor, ctx, "LEAVE_REVIEWED", b.id, { event: "balance_set", type: dto.type, year: dto.year });
    return {
      id: b.id,
      employeeProfileId: b.employeeProfileId,
      type: b.type,
      year: b.year,
      entitledDays: b.entitledDays,
      usedDays: b.usedDays,
      remainingDays: b.entitledDays - b.usedDays,
    };
  }

  private toView(row: LeaveWithEmployee): LeaveView {
    return {
      id: row.id,
      employeeProfileId: row.employeeProfileId,
      employeeName: row.employee.user.name,
      type: row.type,
      startDate: row.startDate.toISOString().slice(0, 10),
      endDate: row.endDate.toISOString().slice(0, 10),
      days: row.days,
      reason: row.reason,
      status: row.status,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewNote: row.reviewNote,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async audit(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    action: "LEAVE_REQUESTED" | "LEAVE_REVIEWED",
    leaveId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.createAuditLog({
      action,
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { leaveId, ...metadata } as Prisma.InputJsonValue,
    });
  }
}

function meta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}
