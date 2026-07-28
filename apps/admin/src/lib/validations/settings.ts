import { z } from "zod";
import type { SettingsResponse, UpdateSettingsInput } from "@/types/settings";

/**
 * تحقق مطابق حرفياً لـ apps/api/src/modules/settings/settings.validator.ts
 * (طبقة دفاع أولى بالواجهة - المصدر الحقيقي يبقى الخادم). لا قواعد جديدة.
 */
export const SUPPORTED_LANGUAGES = ["ar", "en"] as const;
export const SUPPORTED_THEMES = ["light", "dark", "system"] as const;
export const SUPPORTED_DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
export const SUPPORTED_TIME_FORMATS = ["12h", "24h"] as const;
const MAX_PASSWORD_EXPIRATION_DAYS = 365;

const phoneSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\+?[0-9]{7,15}$/.test(v), "رقم هاتف غير صالح");

/** نموذج مُدمَج لكل الحقول القابلة للتعديل بالأقسام الأربعة معاً (نموذج واحد، حفظ واحد) */
export const settingsFormSchema = z.object({
  // General
  companyName: z
    .string()
    .trim()
    .min(2, "الاسم قصير جداً (حرفان على الأقل)")
    .max(150, "الاسم طويل جداً"),
  companyEmail: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === "" || z.email().safeParse(v).success, "بريد إلكتروني غير صالح"),
  companyPhone: phoneSchema,
  companyAddress: z.string().trim().max(300, "العنوان طويل جداً"),
  companyLogoUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || z.url().safeParse(v).success, "رابط غير صالح"),
  defaultCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "يجب أن تكون العملة رمزاً من 3 أحرف (ISO)"),
  defaultTimezone: z.string().trim().min(1, "المنطقة الزمنية مطلوبة").max(100, "طويلة جداً"),
  defaultLanguage: z.enum(SUPPORTED_LANGUAGES),
  // Appearance
  defaultTheme: z.enum(SUPPORTED_THEMES),
  rtlEnabled: z.boolean(),
  dateFormat: z.enum(SUPPORTED_DATE_FORMATS),
  timeFormat: z.enum(SUPPORTED_TIME_FORMATS),
  // Notifications (تفضيلات مُخزَّنة فقط - راجع ملاحظة الصدق بمكوّن الإشعارات)
  emailNotificationsEnabled: z.boolean(),
  smsNotificationsEnabled: z.boolean(),
  inAppNotificationsEnabled: z.boolean(),
  // Security - نص خام يُحوَّل رقماً عند الإرسال (نفس نمط الحقول الرقمية بالمشروع)
  passwordExpirationDays: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) <= MAX_PASSWORD_EXPIRATION_DAYS),
      `يجب أن يكون رقماً موجباً حتى ${MAX_PASSWORD_EXPIRATION_DAYS} يوماً`,
    ),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

/**
 * قيم افتراضية كاملة (كل حقل مُعرَّف، لا undefined إطلاقاً) - ضرورية لـ
 * useForm({defaultValues}) حتى لا يُصبح أي Select مبنياً على watch() قيمة
 * undefined ولو لحظة واحدة قبل مزامنة `values` غير المتزامنة (Base UI
 * يرفض تحويل Select من Uncontrolled إلى Controlled - نفس علة الجلسات
 * السابقة، هنا سببها توقيت useEffect الداخلي لـ RHF وليس كودنا مباشرة)
 */
export const SETTINGS_FORM_DEFAULTS: SettingsFormValues = {
  companyName: "",
  companyEmail: "",
  companyPhone: "",
  companyAddress: "",
  companyLogoUrl: "",
  defaultCurrency: "EGP",
  defaultTimezone: "Africa/Cairo",
  defaultLanguage: "ar",
  defaultTheme: "system",
  rtlEnabled: true,
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24h",
  emailNotificationsEnabled: true,
  smsNotificationsEnabled: false,
  inAppNotificationsEnabled: true,
  passwordExpirationDays: "",
};

function nullToEmpty(value: string | null): string {
  return value ?? "";
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** يحوّل استجابة الخادم إلى قيم نموذج (null → نص فارغ لعرضها بحقول Input) */
export function mapSettingsToFormValues(settings: SettingsResponse): SettingsFormValues {
  return {
    companyName: settings.general.companyName,
    companyEmail: nullToEmpty(settings.general.companyEmail),
    companyPhone: nullToEmpty(settings.general.companyPhone),
    companyAddress: nullToEmpty(settings.general.companyAddress),
    companyLogoUrl: nullToEmpty(settings.general.companyLogoUrl),
    defaultCurrency: settings.general.defaultCurrency,
    defaultTimezone: settings.general.defaultTimezone,
    // Cast آمن: القيم مُتحقَّق منها بصرامة بالخادم (enum whitelist) عند كل PUT سابقة
    defaultLanguage: settings.general.defaultLanguage as SettingsFormValues["defaultLanguage"],
    defaultTheme: settings.appearance.defaultTheme as SettingsFormValues["defaultTheme"],
    rtlEnabled: settings.appearance.rtlEnabled,
    dateFormat: settings.appearance.dateFormat as SettingsFormValues["dateFormat"],
    timeFormat: settings.appearance.timeFormat as SettingsFormValues["timeFormat"],
    emailNotificationsEnabled: settings.notifications.emailNotificationsEnabled,
    smsNotificationsEnabled: settings.notifications.smsNotificationsEnabled,
    inAppNotificationsEnabled: settings.notifications.inAppNotificationsEnabled,
    passwordExpirationDays:
      settings.security.passwordExpirationDays === null
        ? ""
        : String(settings.security.passwordExpirationDays),
  };
}

/** يبني جسم PUT جزئياً - الحقول المُتغيّرة فقط (dirtyFields) بكل قسم، مطابقاً للتحديث الجزئي بالخادم */
export function toUpdateSettingsInput(
  values: SettingsFormValues,
  dirtyFields: Partial<Record<keyof SettingsFormValues, unknown>>,
): UpdateSettingsInput {
  const general: UpdateSettingsInput["general"] = {};
  if (dirtyFields.companyName) general.companyName = values.companyName;
  if (dirtyFields.companyEmail) general.companyEmail = emptyToNull(values.companyEmail);
  if (dirtyFields.companyPhone) general.companyPhone = emptyToNull(values.companyPhone);
  if (dirtyFields.companyAddress) general.companyAddress = emptyToNull(values.companyAddress);
  if (dirtyFields.companyLogoUrl) general.companyLogoUrl = emptyToNull(values.companyLogoUrl);
  if (dirtyFields.defaultCurrency) general.defaultCurrency = values.defaultCurrency;
  if (dirtyFields.defaultTimezone) general.defaultTimezone = values.defaultTimezone;
  if (dirtyFields.defaultLanguage) general.defaultLanguage = values.defaultLanguage;

  const appearance: UpdateSettingsInput["appearance"] = {};
  if (dirtyFields.defaultTheme) appearance.defaultTheme = values.defaultTheme;
  if (dirtyFields.rtlEnabled) appearance.rtlEnabled = values.rtlEnabled;
  if (dirtyFields.dateFormat) appearance.dateFormat = values.dateFormat;
  if (dirtyFields.timeFormat) appearance.timeFormat = values.timeFormat;

  const notifications: UpdateSettingsInput["notifications"] = {};
  if (dirtyFields.emailNotificationsEnabled) {
    notifications.emailNotificationsEnabled = values.emailNotificationsEnabled;
  }
  if (dirtyFields.smsNotificationsEnabled) {
    notifications.smsNotificationsEnabled = values.smsNotificationsEnabled;
  }
  if (dirtyFields.inAppNotificationsEnabled) {
    notifications.inAppNotificationsEnabled = values.inAppNotificationsEnabled;
  }

  const security: UpdateSettingsInput["security"] = {};
  if (dirtyFields.passwordExpirationDays) {
    const trimmed = values.passwordExpirationDays.trim();
    security.passwordExpirationDays = trimmed === "" ? null : Number(trimmed);
  }

  const payload: UpdateSettingsInput = {};
  if (Object.keys(general).length > 0) payload.general = general;
  if (Object.keys(appearance).length > 0) payload.appearance = appearance;
  if (Object.keys(notifications).length > 0) payload.notifications = notifications;
  if (Object.keys(security).length > 0) payload.security = security;
  return payload;
}
