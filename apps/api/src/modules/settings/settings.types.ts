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

/** لا Session Timeout ولا Password Minimum Length هنا - راجع settings.constants.ts */
export interface SecuritySettings {
  passwordExpirationDays: number | null;
}

/** قراءة فقط - محسوبة من بيئة التشغيل الحقيقية، غير مُخزَّنة بقاعدة البيانات إطلاقاً */
export interface SystemInfo {
  applicationName: string;
  applicationVersion: string;
  environment: string;
  /** لا آلية بناء تُثبِّت تاريخاً حالياً بالمشروع - null صادق بدل تاريخ وهمي */
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
