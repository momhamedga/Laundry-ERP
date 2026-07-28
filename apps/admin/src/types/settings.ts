/** مطابق حرفياً لـ SettingsResponse بـ apps/api/src/modules/settings/settings.types.ts */
export interface GeneralSettings {
  companyName: string;
  companyEmail: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  companyLogoUrl: string | null;
  defaultCurrency: string;
  defaultTimezone: string;
  defaultLanguage: string;
}

export interface AppearanceSettings {
  defaultTheme: string;
  rtlEnabled: boolean;
  dateFormat: string;
  timeFormat: string;
}

export interface NotificationsSettings {
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
}

/** لا Session Timeout ولا Password Minimum Length - غير موجودين بالخادم إطلاقاً (قيم حقيقية بأماكن أخرى) */
export interface SecuritySettings {
  passwordExpirationDays: number | null;
}

/** قراءة فقط بالكامل - محسوبة من بيئة تشغيل الخادم، لا حقل قابل للتعديل هنا */
export interface SystemInfo {
  applicationName: string;
  applicationVersion: string;
  environment: string;
  buildDate: string | null;
}

export interface SettingsResponse {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  notifications: NotificationsSettings;
  security: SecuritySettings;
  system: SystemInfo;
  updatedAt: string;
}

/** جسم PUT - كل قسم اختياري، وكل حقل داخله اختياري (تحديث جزئي حقيقي) */
export interface UpdateSettingsInput {
  general?: Partial<GeneralSettings>;
  appearance?: Partial<AppearanceSettings>;
  notifications?: Partial<NotificationsSettings>;
  security?: Partial<SecuritySettings>;
}
