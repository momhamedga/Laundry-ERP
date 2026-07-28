import { ContractType, EmployeeDocumentType, EmploymentStatus } from "@prisma/client";
import { z } from "zod";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
} from "./employees.constants.js";

export const employeeIdParamSchema = z.object({ id: z.cuid("Invalid employee id") });

const url = z.string().trim().url("رابط غير صالح").max(2000);
const optionalText = (max: number) => z.string().trim().max(max).optional();

/** الحقول القابلة للتعديل - مشتركة بين الإنشاء والتحديث */
const profileFields = {
  employeeCode: z.string().trim().min(1).max(50).optional(),
  jobTitle: optionalText(120),
  department: optionalText(120),
  employmentType: z.enum(ContractType).optional(),
  hireDate: z.coerce.date().optional(),
  nationalId: optionalText(50),
  personalPhone: optionalText(30),
  personalEmail: z.string().trim().email("بريد غير صالح").max(200).optional(),
  address: optionalText(300),
  emergencyName: optionalText(120),
  emergencyPhone: optionalText(30),
  baseSalary: z.coerce.number().min(0).max(100_000_000).optional(),
  contractUrl: url.optional(),
  idCardUrl: url.optional(),
  photoUrl: url.optional(),
  notes: optionalText(1000),
};

export const createEmployeeSchema = z.object({
  userId: z.cuid("معرّف المستخدم مطلوب"),
  ...profileFields,
});

export const updateEmployeeSchema = z
  .object(profileFields)
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "لا توجد حقول للتحديث" });

export const changeEmployeeStatusSchema = z.object({
  status: z.enum(EmploymentStatus),
  reason: optionalText(300),
});

export const listEmployeesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(MAX_SEARCH_LENGTH).optional(),
  status: z.enum(EmploymentStatus).optional(),
  department: z.string().trim().max(120).optional(),
});

// ==================== Documents (Phase 9.6b) ====================

export const documentIdParamSchema = z.object({ id: z.cuid("Invalid document id") });

export const createDocumentSchema = z.object({
  type: z.enum(EmployeeDocumentType),
  name: z.string().trim().min(1).max(200),
  number: z.string().trim().max(100).optional(),
  url: z.string().trim().url("رابط غير صالح").max(2000).optional(),
  issueDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  note: z.string().trim().max(500).optional(),
});

export const updateDocumentSchema = createDocumentSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "لا توجد حقول للتحديث" });

export const expiringDocsQuerySchema = z.object({
  withinDays: z.coerce.number().int().min(1).max(365).default(30),
});
