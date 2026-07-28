import type { z } from "zod";
import type {
  attendanceCorrectionSchema,
  clockActionSchema,
  employeeRefSchema,
  listAttendanceQuerySchema,
} from "./attendance.validator.js";
import type {
  createLeaveSchema,
  listLeavesQuerySchema,
  reviewLeaveSchema,
  upsertLeaveBalanceSchema,
} from "./leaves.validator.js";
import type {
  generatePayrollSchema,
  listPayrollQuerySchema,
  upsertSalaryComponentSchema,
} from "./payroll.validator.js";

export type ClockActionDto = z.infer<typeof clockActionSchema>;
export type EmployeeRefDto = z.infer<typeof employeeRefSchema>;
export type AttendanceCorrectionDto = z.infer<typeof attendanceCorrectionSchema>;
export type ListAttendanceQueryDto = z.infer<typeof listAttendanceQuerySchema>;

export type CreateLeaveDto = z.infer<typeof createLeaveSchema>;
export type ReviewLeaveDto = z.infer<typeof reviewLeaveSchema>;
export type UpsertLeaveBalanceDto = z.infer<typeof upsertLeaveBalanceSchema>;
export type ListLeavesQueryDto = z.infer<typeof listLeavesQuerySchema>;

export type GeneratePayrollDto = z.infer<typeof generatePayrollSchema>;
export type UpsertSalaryComponentDto = z.infer<typeof upsertSalaryComponentSchema>;
export type ListPayrollQueryDto = z.infer<typeof listPayrollQuerySchema>;
