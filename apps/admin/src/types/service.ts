import type { PaginationMeta, SortOrder } from "@/types";

export type ServiceUnit = "PIECE" | "KG" | "FIXED";
export type ServiceSortField = "sortOrder" | "name" | "price" | "createdAt";

export interface ServiceCategorySummary {
  id: string;
  name: string;
  isActive: boolean;
}

/** الخدمة كما يعيدها الخادم - price هو Decimal فيصل كنص (Prisma.Decimal.toJSON) */
export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: string;
  unit: ServiceUnit;
  estimatedHours: number | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
  category: ServiceCategorySummary;
  /** = isActive && category.isActive - محسوبة بالخادم */
  available: boolean;
}

export interface ListServicesParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  unit?: ServiceUnit;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: ServiceSortField;
  sortOrder?: SortOrder;
}

export interface ListServicesResult {
  services: Service[];
  meta: PaginationMeta;
}

export interface ServiceMutationInput {
  name: string;
  description: string | null;
  categoryId: string;
  unit: ServiceUnit;
  price: number;
  estimatedHours: number | null;
  sortOrder: number;
}

/** الإنشاء فقط يقبل isActive - التعديل لا يملك هذا الحقل بالخادم */
export interface CreateServiceInput extends ServiceMutationInput {
  isActive: boolean;
}
