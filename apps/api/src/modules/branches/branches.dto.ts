import type { z } from "zod";
import type {
  branchStatusSchema,
  createBranchSchema,
  listBranchesQuerySchema,
  updateBranchSchema,
} from "./branches.validator.js";

/**
 * DTOs مشتقة من مخططات Zod - مصدر حقيقة واحد
 */
export type CreateBranchDto = z.infer<typeof createBranchSchema>;
export type UpdateBranchDto = z.infer<typeof updateBranchSchema>;
export type BranchStatusDto = z.infer<typeof branchStatusSchema>;
export type ListBranchesQuery = z.infer<typeof listBranchesQuerySchema>;
