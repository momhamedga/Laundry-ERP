import type { z } from "zod";
import type {
  categoryStatusSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from "./category.validator.js";

/**
 * DTOs مشتقة من مخططات Zod - مصدر حقيقة واحد
 */
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type CategoryStatusDto = z.infer<typeof categoryStatusSchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
