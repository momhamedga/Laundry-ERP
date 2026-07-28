import { AttendanceStatus } from "@prisma/client";
import { z } from "zod";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./hr.constants.js";

export const attendanceIdParamSchema = z.object({ id: z.cuid("Invalid attendance id") });

export const clockActionSchema = z.object({
  employeeProfileId: z.cuid(),
  location: z.string().trim().max(200).optional(),
  device: z.string().trim().max(200).optional(),
});

export const employeeRefSchema = z.object({ employeeProfileId: z.cuid() });

/** تصحيح يدوي لسجل حضور (يحتاج اعتماد) */
export const attendanceCorrectionSchema = z.object({
  employeeProfileId: z.cuid(),
  workDate: z.coerce.date(),
  clockInAt: z.coerce.date().nullable().optional(),
  clockOutAt: z.coerce.date().nullable().optional(),
  status: z.enum(AttendanceStatus).optional(),
  breakMinutes: z.coerce.number().int().min(0).max(1440).optional(),
  note: z.string().trim().max(500).optional(),
});

export const listAttendanceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  employeeProfileId: z.cuid().optional(),
  status: z.enum(AttendanceStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
