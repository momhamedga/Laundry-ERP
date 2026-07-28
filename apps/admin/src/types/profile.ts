/** الحقول المسموح للمستخدم تعديلها بملفه الشخصي فقط - مطابق لـ updateProfileSchema بالخادم */
export interface UpdateProfileInput {
  name: string;
  phone: string | null;
}
