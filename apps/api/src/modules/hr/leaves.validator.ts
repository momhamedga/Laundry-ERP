import { LeaveStatus, LeaveType } from "@prisma/client";
import { z } from "zod";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./hr.constants.js";

export const leaveIdParamSchema = z.object({ id: z.cuid("Invalid leave id") });

export const createLeaveSchema = z
  .object({
    employeeProfileId: z.cuid(),
    type: z.enum(LeaveType),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.startDate.getTime() <= d.endDate.getTime(), {
    message: "تاريخ البداية يجب أن يسبق النهاية",
    path: ["endDate"],
  });

export const reviewLeaveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(500).optional(),
});

export const upsertLeaveBalanceSchema = z.object({
  employeeProfileId: z.cuid(),
  type: z.enum(LeaveType),
  year: z.coerce.number().int().min(2000).max(2100),
  entitledDays: z.coerce.number().int().min(0).max(365),
});

export const listLeavesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  employeeProfileId: z.cuid().optional(),
  status: z.enum(LeaveStatus).optional(),
  type: z.enum(LeaveType).optional(),
});
