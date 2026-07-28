import type { PaginationMeta, SortOrder } from "@/types";

export type CategorySortField = "sortOrder" | "name" | "createdAt";

export interface ServiceCategory {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** تصنيف مع عدد خدماته - كما يعيده الخادم دائماً */
export interface CategoryWithCount extends ServiceCategory {
  servicesCount: number;
}

export interface ListCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: CategorySortField;
  sortOrder?: SortOrder;
}

export interface ListCategoriesResult {
  categories: CategoryWithCount[];
  meta: PaginationMeta;
}

export interface CategoryMutationInput {
  name: string;
  sortOrder: number;
}
