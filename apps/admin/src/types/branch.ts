import type { PaginationMeta, SortOrder } from "@/types";

export type BranchSortField = "name" | "createdAt";

/** الفرع كما يعيده الخادم - يشمل عدد الموظفين/الطلبات المرتبطة (لقاعدة حذف الفارغ فقط) */
export interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  usersCount: number;
  ordersCount: number;
}

export interface ListBranchesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: BranchSortField;
  sortOrder?: SortOrder;
}

export interface ListBranchesResult {
  branches: Branch[];
  meta: PaginationMeta;
}

export interface CreateBranchInput {
  name: string;
  address: string | null;
  phone: string | null;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string | null;
  phone?: string | null;
}
