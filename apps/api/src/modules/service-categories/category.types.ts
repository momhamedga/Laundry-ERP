import type { ServiceCategory } from "@prisma/client";

/** بيانات الترقيم الموحدة في meta */
export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** تصنيف مع عدد خدماته */
export interface CategoryWithCount extends ServiceCategory {
  servicesCount: number;
}

export interface ListCategoriesResult {
  categories: CategoryWithCount[];
  meta: PaginationMeta;
}
