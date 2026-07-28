import type { AttendanceRecord, AttendanceStatus, Prisma } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type { AuthenticatedUser, RequestContext } from "../auth/index.js";
import type {
  AttendanceCorrectionDto,
  ClockActionDto,
  EmployeeRefDto,
  ListAttendanceQueryDto,
} from "./hr.dto.js";
import {
  STANDARD_START_HOUR,
  STANDARD_START_MINUTE,
  STANDARD_WORK_HOURS,
  todayDate,
  toDateOnly,
} from "./hr.constants.js";
import type { AttendanceRepository, AttendanceWithEmployee } from "./attendance.repository.js";
import type { AttendanceView, PaginationMeta } from "./hr.types.js";

export class AttendanceService {
  constructor(private readonly repo: AttendanceRepository) {}

  async clockIn(actor: AuthenticatedUser, ctx: RequestContext, dto: ClockActionDto): Promise<AttendanceView> {
    await this.ensureEmployee(dto.employeeProfileId);
    const workDate = todayDate();
    const existing = await this.repo.findForDate(dto.employeeProfileId, workDate);
    if (existing?.clockInAt) throw new ApiError(409, "تم تسجيل الحضور لهذا اليوم بالفعل");

    const now = new Date();
    const lateMinutes = this.computeLate(now);
    const status: AttendanceStatus = lateMinutes > 0 ? "LATE" : "PRESENT";

    const row = existing
      ? await this.repo.update(existing.id, {
          clockInAt: now,
          status,
          lateMinutes,
          location: dto.location ?? null,
          device: dto.device ?? null,
          ipAddress: ctx.ipAddress,
        })
      : await this.repo.create({
          employeeProfileId: dto.employeeProfileId,
          workDate,
          clockInAt: now,
          status,
          lateMinutes,
          location: dto.location ?? null,
          device: dto.device ?? null,
          ipAddress: ctx.ipAddress,
        });

    await this.audit(actor, ctx, row.id, { event: "clock_in", lateMinutes });
    return this.toView(row);
  }

  async clockOut(actor: AuthenticatedUser, ctx: RequestContext, dto: EmployeeRefDto): Promise<AttendanceView> {
    const rec = await this.requireToday(dto.employeeProfileId);
    if (!rec.clockInAt) throw new ApiError(409, "لا يوجد تسجيل حضور لإغلاقه");
    if (rec.clockOutAt) throw new ApiError(409, "تم تسجيل الانصراف بالفعل");

    const now = new Date();
    // إن كان في استراحة جارية، تُنهى تلقائياً عند الانصراف
    let breakMinutes = rec.breakMinutes;
    if (rec.breakStartedAt) breakMinutes += minutesBetween(rec.breakStartedAt, now);

    const grossMinutes = minutesBetween(rec.clockInAt, now);
    const workedMinutes = Math.max(0, grossMinutes - breakMinutes);
    const overtimeMinutes = Math.max(0, workedMinutes - STANDARD_WORK_HOURS * 60);

    const row = await this.repo.update(rec.id, {
      clockOutAt: now,
      breakStartedAt: null,
      breakMinutes,
      workedMinutes,
      overtimeMinutes,
    });
    await this.audit(actor, ctx, rec.id, { event: "clock_out", workedMinutes, overtimeMinutes });
    return this.toView(row);
  }

  async startBreak(actor: AuthenticatedUser, ctx: RequestContext, dto: EmployeeRefDto): Promise<AttendanceView> {
    const rec = await this.requireToday(dto.employeeProfileId);
    if (!rec.clockInAt || rec.clockOutAt) throw new ApiError(409, "لا يمكن بدء استراحة الآن");
    if (rec.breakStartedAt) throw new ApiError(409, "يوجد استراحة جارية بالفعل");
    const row = await this.repo.update(rec.id, { breakStartedAt: new Date() });
    return this.toView(row);
  }

  async resumeBreak(actor: AuthenticatedUser, ctx: RequestContext, dto: EmployeeRefDto): Promise<AttendanceView> {
    const rec = await this.requireToday(dto.employeeProfileId);
    if (!rec.breakStartedAt) throw new ApiError(409, "لا توجد استراحة جارية");
    const added = minutesBetween(rec.breakStartedAt, new Date());
    const row = await this.repo.update(rec.id, {
      breakStartedAt: null,
      breakMinutes: rec.breakMinutes + added,
    });
    return this.toView(row);
  }

  /** تصحيح يدوي (isManual=true) - يحتاج اعتماداً لاحقاً */
  async correct(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    dto: AttendanceCorrectionDto,
  ): Promise<AttendanceView> {
    await this.ensureEmployee(dto.employeeProfileId);
    const workDate = toDateOnly(dto.workDate);
    const base = {
      clockInAt: dto.clockInAt ?? null,
      clockOutAt: dto.clockOutAt ?? null,
      status: dto.status ?? ("PRESENT" as AttendanceStatus),
      breakMinutes: dto.breakMinutes ?? 0,
      note: dto.note ?? null,
      isManual: true,
      approvedById: null,
      approvedAt: null,
    };
    let workedMinutes = 0;
    if (dto.clockInAt && dto.clockOutAt) {
      workedMinutes = Math.max(0, minutesBetween(dto.clockInAt, dto.clockOutAt) - (dto.breakMinutes ?? 0));
    }
    const overtimeMinutes = Math.max(0, workedMinutes - STANDARD_WORK_HOURS * 60);

    const row = await this.repo.upsertCorrection(
      dto.employeeProfileId,
      workDate,
      { employeeProfileId: dto.employeeProfileId, workDate, workedMinutes, overtimeMinutes, ...base },
      { ...base, workedMinutes, overtimeMinutes },
    );
    await this.audit(actor, ctx, row.id, { event: "manual_correction" });
    return this.toView(row);
  }

  async approve(actor: AuthenticatedUser, ctx: RequestContext, id: string): Promise<AttendanceView> {
    const rec = await this.repo.findById(id);
    if (!rec) throw new ApiError(404, "سجل الحضور غير موجود");
    const row = await this.repo.update(id, { approvedById: actor.id, approvedAt: new Date() });
    await this.audit(actor, ctx, id, { event: "approved" });
    return this.toView(row);
  }

  async list(query: ListAttendanceQueryDto): Promise<{ records: AttendanceView[]; meta: PaginationMeta }> {
    const { page, limit } = query;
    const { rows, total } = await this.repo.list({
      skip: (page - 1) * limit,
      take: limit,
      employeeProfileId: query.employeeProfileId,
      status: query.status,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
    return { records: rows.map((r) => this.toView(r)), meta: meta(page, limit, total) };
  }

  // ==================== helpers ====================

  private computeLate(now: Date): number {
    const start = new Date(now);
    start.setHours(STANDARD_START_HOUR, STANDARD_START_MINUTE, 0, 0);
    return Math.max(0, minutesBetween(start, now));
  }

  private async ensureEmployee(id: string): Promise<void> {
    const e = await this.repo.employeeExists(id);
    if (!e) throw new ApiError(404, "ملف الموظف غير موجود");
  }

  private async requireToday(employeeProfileId: string): Promise<AttendanceRecord> {
    const rec = await this.repo.findForDate(employeeProfileId, todayDate());
    if (!rec) throw new ApiError(409, "لا يوجد سجل حضور لهذا اليوم");
    return rec;
  }

  private toView(row: AttendanceWithEmployee): AttendanceView {
    return {
      id: row.id,
      employeeProfileId: row.employeeProfileId,
      employeeName: row.employee.user.name,
      workDate: row.workDate.toISOString().slice(0, 10),
      clockInAt: row.clockInAt?.toISOString() ?? null,
      clockOutAt: row.clockOutAt?.toISOString() ?? null,
      onBreak: row.breakStartedAt !== null,
      breakMinutes: row.breakMinutes,
      workedMinutes: row.workedMinutes,
      lateMinutes: row.lateMinutes,
      overtimeMinutes: row.overtimeMinutes,
      status: row.status,
      location: row.location,
      device: row.device,
      ipAddress: row.ipAddress,
      isManual: row.isManual,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async audit(
    actor: AuthenticatedUser,
    ctx: RequestContext,
    recordId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.createAuditLog({
      action: "ATTENDANCE_UPDATED",
      userId: actor.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { attendanceId: recordId, ...metadata } as Prisma.InputJsonValue,
    });
  }
}

function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

function meta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}
