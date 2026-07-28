import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";
import type { ChangePasswordInput } from "@/types/change-password";
import type { UpdateProfileInput } from "@/types/profile";
import type { User, UserDetails } from "@/types/user";

/** GET /users/profile - بيانات المستخدم الحالي (self) فقط - بلا صلاحية إضافية */
export async function getProfile(): Promise<UserDetails> {
  const { data } = await apiClient.get<ApiResponse<UserDetails>>("/users/profile");
  return data.data;
}

/** PATCH /users/profile - الاسم والهاتف فقط (البريد/الدور/الفرع/الحالة غير قابلة للتعديل هنا) */
export async function updateProfile(input: UpdateProfileInput): Promise<User> {
  const { data } = await apiClient.patch<ApiResponse<{ user: User }>>("/users/profile", input);
  return data.data.user;
}

/**
 * POST /auth/change-password (self) - Endpoint حقيقي بوحدة auth وليس users،
 * مُنظَّم هنا ضمن profile.service.ts عمداً لأن واجهة "الملف الشخصي" تملك تجربة
 * تغيير كلمة السر الذاتية، مطابقةً لتوجيه المهمة الصريح بعدم إنشاء ملف Service
 * جديد. يُبطل الخادم كل جلسات المستخدم (refresh tokens + كوكي الـ Refresh)
 * فور النجاح - الجلسة الحالية بالذاكرة (Access Token) تبقى صالحة حتى انتهاء
 * صلاحيتها الطبيعية القصيرة (لا تسجيل خروج فوري، بلا أي تعديل على منطق الجلسة).
 */
export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await apiClient.post("/auth/change-password", input);
}
