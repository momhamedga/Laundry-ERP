"use client";

import { useMutation } from "@tanstack/react-query";
import * as passwordResetService from "@/services/password-reset.service";
import type { ForgotPasswordInput, ResetPasswordInput } from "@/types/reset-password";

/**
 * بلا Query ولا Invalidation - عمليتان لمرة واحدة بلا حالة تُخزَّن بالكاش.
 * التعامل مع النجاح/الخطأ (رسائل الخادم الحرفية) يتم بالكامل داخل مكوّنات
 * النموذج نفسها (Success/Error State مخصصة لكل صفحة) - لا Toast هنا تفادياً
 * لازدواج الرسالة.
 */
export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => passwordResetService.forgotPassword(input),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => passwordResetService.resetPassword(input),
  });
}
