import type { z } from "zod";
import type {
  createServiceSchema,
  listServicesQuerySchema,
  serviceStatusSchema,
  updateServiceSchema,
} from "./services.validator.js";

/**
 * DTOs مشتقة من مخططات Zod - مصدر حقيقة واحد
 */
export type CreateServiceDto = z.infer<typeof createServiceSchema>;
export type UpdateServiceDto = z.infer<typeof updateServiceSchema>;
export type ServiceStatusDto = z.infer<typeof serviceStatusSchema>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
