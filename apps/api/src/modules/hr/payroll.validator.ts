import { PayrollStatus, SalaryComponentType } from "@prisma/client";
import { z } from "zod";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./hr.constants.js";

export const payrollRunIdParamSchema = z.object({ id: z.cuid("Invalid payroll run id") });
export const componentIdParamSchema = z.object({ id: z.cuid("Invalid component id") });
export const employeeIdParamSchema = z.object({ id: z.cuid("Invalid employee id") });

export const generatePayrollSchema = z
  .object({
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    label: z.string().trim().min(1).max(60).optional(),
  })
  .refine((d) => d.periodStart.getTime() <= d.periodEnd.getTime(), {
    message: "بداية الفترة يجب أن تسبق نهايتها",
    path: ["periodEnd"],
  });

export const upsertSalaryComponentSchema = z.object({
  employeeProfileId: z.cuid(),
  type: z.enum(SalaryComponentType),
  label: z.string().trim().min(1).max(120),
  amount: z.coerce.number().min(0).max(100_000_000),
  isActive: z.coerce.boolean().optional(),
});

export const listPayrollQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  status: z.enum(PayrollStatus).optional(),
});
