import type { z } from "zod";
import type {
  activityQuerySchema,
  adminResetPasswordSchema,
  assignRoleSchema,
  changeStatusSchema,
  createUserSchema,
  listUsersQuerySchema,
  updateProfileSchema,
  updateUserSchema,
} from "./users.validator.js";

/**
 * DTOs مشتقة من مخططات Zod - مصدر حقيقة واحد
 */
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type ChangeStatusDto = z.infer<typeof changeStatusSchema>;
export type AssignRoleDto = z.infer<typeof assignRoleSchema>;
export type AdminResetPasswordDto = z.infer<typeof adminResetPasswordSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
