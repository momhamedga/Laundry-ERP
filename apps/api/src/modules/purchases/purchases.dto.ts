import type { z } from "zod";
import type {
  createPurchaseSchema,
  listPurchasesQuerySchema,
  updatePurchaseSchema,
} from "./purchases.validator.js";

export type CreatePurchaseDto = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseDto = z.infer<typeof updatePurchaseSchema>;
export type ListPurchasesQuery = z.infer<typeof listPurchasesQuerySchema>;
