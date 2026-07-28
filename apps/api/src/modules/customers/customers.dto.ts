import type { z } from "zod";
import type {
  createCustomerSchema,
  listCustomersQuerySchema,
  mergeCustomersSchema,
  updateCustomerSchema,
  updateNotesSchema,
} from "./customers.validator.js";

/**
 * DTOs مشتقة من مخططات Zod - مصدر حقيقة واحد
 */
export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerDto = z.infer<typeof updateCustomerSchema>;
export type UpdateNotesDto = z.infer<typeof updateNotesSchema>;
export type MergeCustomersDto = z.infer<typeof mergeCustomersSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
