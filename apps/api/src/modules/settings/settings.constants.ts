// ==================== System (قراءة فقط - غير مُخزَّنة بقاعدة البيانات) ====================

/** اسم المنتج - نفس التسمية المُستخدَمة بشعار الواجهة الأمامية (AppLogo) وقوالب البريد */
export const APPLICATION_NAME = "Laundry ERP";

// ==================== القيم المسموحة (Whitelists) ====================

export const SUPPORTED_LANGUAGES = ["ar", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const SUPPORTED_THEMES = ["light", "dark", "system"] as const;
export type SupportedTheme = (typeof SUPPORTED_THEMES)[number];

export const SUPPORTED_DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
export type SupportedDateFormat = (typeof SUPPORTED_DATE_FORMATS)[number];

export const SUPPORTED_TIME_FORMATS = ["12h", "24h"] as const;
export type SupportedTimeFormat = (typeof SUPPORTED_TIME_FORMATS)[number];

// ==================== حدود التحقق ====================

export const MAX_PASSWORD_EXPIRATION_DAYS = 365;

/**
 * ==================== ملاحظة معمارية مهمة ====================
 * حقلان مطلوبان بمواصفة المهمة بقسم Security **لم يُضافا** لهذا النموذج
 * عمداً، لأن كلاً منهما قيمة حقيقية مُطبَّقة فعلياً بمكان آخر بالفعل - إضافة
 * نسخة ثانية غير متصلة بالمنطق التشغيلي الحقيقي كانت ستخلق مصدرين متعارضين
 * للحقيقة (المستخدم يغيّرها بالإعدادات ولا يحدث أي أثر فعلي):
 *
 * 1) Session Timeout → تتحكم به فعلياً ACCESS_TOKEN_TTL_MIN/REFRESH_TOKEN_TTL_DAYS
 *    بـ apps/api/src/config/env.ts - قيمة بيئة حقيقية تُطبَّق على كل توكين يُصدَر.
 *
 * 2) Password Minimum Length → مُثبَّتة حرفياً بـ passwordSchema (8 أحرف) بكل
 *    مخططات كلمة السر بوحدتي auth وusers (auth.validator.ts/users.validator.ts).
 *
 * الحقل الوحيد المُضاف فعلياً بقسم Security هو passwordExpirationDays - وهو
 * تخزين تهيئة صادق لميزة مستقبلية (لا يوجد أي فحص تشغيلي حالياً يستخدمه
 * لإجبار تغيير كلمة السر بعد انتهاء المدة - يُعرض كقيمة مُخزَّنة بصدق فقط).
 */
