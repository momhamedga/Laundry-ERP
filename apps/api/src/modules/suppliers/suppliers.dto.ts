import type { z } from "zod";
import type {
  createSupplierSchema,
  listSuppliersQuerySchema,
  updateSupplierSchema,
} from "./suppliers.validator.js";

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierDto = z.infer<typeof updateSupplierSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
