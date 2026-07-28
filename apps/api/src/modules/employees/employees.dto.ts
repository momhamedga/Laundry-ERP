import type { z } from "zod";
import type {
  changeEmployeeStatusSchema,
  createDocumentSchema,
  createEmployeeSchema,
  listEmployeesQuerySchema,
  updateDocumentSchema,
  updateEmployeeSchema,
} from "./employees.validator.js";

export type CreateEmployeeDto = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeDto = z.infer<typeof updateEmployeeSchema>;
export type ChangeEmployeeStatusDto = z.infer<typeof changeEmployeeStatusSchema>;
export type ListEmployeesQueryDto = z.infer<typeof listEmployeesQuerySchema>;
export type CreateDocumentDto = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>;
