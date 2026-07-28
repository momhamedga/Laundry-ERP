/** مطابق لـ forgotPasswordSchema بـ apps/api/src/modules/auth/auth.validator.ts */
export interface ForgotPasswordInput {
  email: string;
}

/** مطابق لـ resetPasswordSchema بـ apps/api/src/modules/auth/auth.validator.ts */
export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}
