"use client";

import { useActiveBranchesQuery } from "@/hooks/use-branches";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * حالة تهيئة النظام.
 *
 * العطل الذي تعالجه: يمكن أن يقلع النظام بلا أي فرع، فيصل الموظّف إلى معالج
 * إنشاء الطلب ويفشل عند الحفظ برسالة عن حساب غير مرتبط بفرع. أوّل تجربة مع
 * النظام تصير رسالة خطأ في منتصف عملٍ كان يظنّه سليماً.
 *
 * المؤشّر: وجود فرع نشط واحد على الأقل.
 * مشتقٌّ من قواعد العمل القائمة لا من علم جديد: orders.service.ts يشترط فرعاً
 * (من الطلب أو من حساب المنشئ) ويرفض بلا ذلك، ويشترط أن يكون الفرع نشطاً.
 * فالنظام بلا فرع نشط عاجزٌ فعلاً عن وظيفته الأساسية — إنشاء طلب.
 *
 * ولم يُضَف حقل «اكتملت التهيئة» في قاعدة البيانات: علَمٌ منفصل يمكن أن يكذب
 * (يُرفع ثم يُحذف الفرع)، بينما الاشتقاق من الحالة الفعلية لا يكذب أبداً.
 * وهو ما يجعل فشل خطوةٍ لاحقة لا يجعل النظام يعتبر نفسه مهيّأً.
 */
export interface SetupStatus {
  /** لم يُحسم بعد — لا تتّخذ أي قرار توجيه */
  isLoading: boolean;
  /** لا فرع نشط ⇒ النظام غير مهيّأ */
  needsSetup: boolean;
  /** هل يملك المستخدم الحالي إتمام التهيئة فعلياً؟ */
  canRunSetup: boolean;
  /** تعذّر تحديد الحالة (شبكة/خادم) — لا يُعامَل كـ«غير مهيّأ» */
  isUnknown: boolean;
}

export function useSetupStatus(): SetupStatus {
  const { can } = usePermissions();
  const { data: branches, isPending, isError } = useActiveBranchesQuery();

  /**
   * إتمام التهيئة يتطلّب الصلاحيات الثلاث التي تفرضها المسارات فعلاً:
   * branches:manage وservices:manage وusers:manage. ADMIN وحده يملكها مجتمعةً
   * (MANAGER يملك services:manage فقط) — فلا حاجة لدور أو صلاحية جديدة.
   */
  const canRunSetup =
    can("branches:manage") && can("services:manage") && can("users:manage");

  /**
   * خطأ الجلب ليس «غير مهيّأ»: انقطاع شبكة أو خطأ خادم كان سيحبس مستخدماً في
   * نظام مهيّأ داخل معالج تهيئة لا يحتاجه، وربما يدفعه لإنشاء فرع مكرّر.
   */
  if (isError) {
    return { isLoading: false, needsSetup: false, canRunSetup, isUnknown: true };
  }

  return {
    isLoading: isPending,
    needsSetup: !isPending && (branches?.length ?? 0) === 0,
    canRunSetup,
    isUnknown: false,
  };
}
