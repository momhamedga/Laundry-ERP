"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AUTH_QUERY_KEY } from "@/hooks/use-auth";
import { getErrorMessage } from "@/lib/axios";
import * as profileService from "@/services/profile.service";
import type { ChangePasswordInput } from "@/types/change-password";
import type { UpdateProfileInput } from "@/types/profile";

export const profileKeys = {
  all: ["profile"] as const,
  detail: () => [...profileKeys.all, "detail"] as const,
};

export function useProfileQuery() {
  return useQuery({
    queryKey: profileKeys.detail(),
    queryFn: () => profileService.getProfile(),
  });
}

/**
 * بعد نجاح التحديث: إبطال profile.detail (بيانات الصفحة) وAUTH_QUERY_KEY الموجود
 * مسبقاً بـ use-auth.ts (بلا تعديل ذلك الملف) - يُحدِّث اسم/بريد المستخدم بقائمة
 * الهيدر (UserMenu) تلقائياً عبر إعادة الجلب الطبيعية لـ useCurrentUserQuery
 */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => profileService.updateProfile(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
      void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      toast.success("تم تحديث الملف الشخصي بنجاح");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

/**
 * تغيير كلمة السر الذاتية - بلا أي إبطال Cache هنا (لا بيانات ملف شخصي تغيّرت
 * فعلياً). النجاح يُدار محلياً بمكوّن النموذج (Reset + SuccessState) وليس هنا
 * - بلا Redirect أو Logout أو إبطال جلسة يدوي (الخادم يتكفّل بذلك من جهته).
 */
export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => profileService.changePassword(input),
    onSuccess: () => toast.success("تم تغيير كلمة المرور بنجاح"),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}
