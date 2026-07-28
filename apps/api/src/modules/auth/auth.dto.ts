import type { z } from "zod";
import type {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  revokeSessionSchema,
} from "./auth.validator.js";

/**
 * DTOs مشتقة من مخططات Zod - مصدر حقيقة واحد بلا تكرار
 */
export type LoginDto = z.infer<typeof loginSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type RevokeSessionDto = z.infer<typeof revokeSessionSchema>;
