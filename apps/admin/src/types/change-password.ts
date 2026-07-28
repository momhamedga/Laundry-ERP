/** مطابق لـ changePasswordSchema بـ apps/api/src/modules/auth/auth.validator.ts */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
