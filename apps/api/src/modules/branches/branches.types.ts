import type { Branch } from "@prisma/client";

/** بيانات الترقيم الموحدة في meta */
export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** فرع مع عدد موظفيه وطلباته */
export interface BranchWithCounts extends Branch {
  usersCount: number;
  ordersCount: number;
}

export interface ListBranchesResult {
  branches: BranchWithCounts[];
  meta: PaginationMeta;
}
