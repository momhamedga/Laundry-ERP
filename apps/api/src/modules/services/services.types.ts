import type { Service } from "@prisma/client";

/** بيانات الترقيم الموحدة في meta */
export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** ملخص التصنيف المضمن مع الخدمة */
export interface ServiceCategorySummary {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * خدمة مع تصنيفها وحالة الإتاحة المحسوبة
 * available = service.isActive && category.isActive
 * (تعطيل التصنيف يجعل خدماته غير متاحة للطلبات الجديدة فقط)
 */
export interface ServiceWithCategory extends Service {
  category: ServiceCategorySummary;
  available: boolean;
}

export interface ListServicesResult {
  services: ServiceWithCategory[];
  meta: PaginationMeta;
}
