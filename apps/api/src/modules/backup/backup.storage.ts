import type { BackupProvider } from "@prisma/client";
import { env } from "../../config/env.js";

/**
 * مزوّد تخزين النسخ (Strategy Pattern) - نفس نمط ChannelRegistry للإشعارات حرفياً.
 * LOCAL حقيقي؛ S3/R2/BACKBLAZE مزوّدات Scaffold (configured=false بلا تكامل SDK،
 * تماماً كـSMS/WhatsApp/Push). configured=false يعني: الخدمة تتراجع إلى LOCAL بلا
 * إسقاط الخادم. credentialsDetected يكشف وجود أسرار بالبيئة للعرض بالواجهة.
 */
export interface BackupStorageProvider {
  readonly provider: BackupProvider;
  /** جاهز للاستخدام فعلياً (LOCAL دائماً true؛ السحابة false حتى يُدمَج SDK) */
  readonly configured: boolean;
  /** رُصدت أسرار بالبيئة (لعرض "بانتظار التكامل" بالواجهة) - لا يعني configured */
  readonly credentialsDetected: boolean;
  /** يثبّت ملفاً مكتوباً محلياً ويعيد المسار/المفتاح النهائي - لا يُستدعى إن كان configured=false */
  persist(localFilePath: string): Promise<string>;
}

/** التخزين المحلي - الملف مكتوب أصلاً بمجلد النسخ، لا خطوة إضافية */
class LocalStorageProvider implements BackupStorageProvider {
  readonly provider = "LOCAL" as const;
  readonly configured = true;
  readonly credentialsDetected = true;

  persist(localFilePath: string): Promise<string> {
    return Promise.resolve(localFilePath);
  }
}

/**
 * مزوّد سحابي متوافق مع S3 (يخدم S3/R2/Backblaze بنفس البروتوكول). Scaffold:
 * configured=false دائماً حالياً (لا SDK مُدمَج) - credentialsDetected يعكس البيئة.
 * persist() يرمي بوضوح إن استُدعي (الخدمة تحرسه بفحص configured أولاً).
 */
class S3CompatibleStorageProvider implements BackupStorageProvider {
  readonly configured = false;

  constructor(readonly provider: BackupProvider) {}

  get credentialsDetected(): boolean {
    return Boolean(
      env.BACKUP_S3_BUCKET &&
        env.BACKUP_S3_ACCESS_KEY_ID &&
        env.BACKUP_S3_SECRET_ACCESS_KEY,
    );
  }

  persist(): Promise<string> {
    return Promise.reject(
      new Error(`${this.provider} storage is a scaffold - SDK integration pending`),
    );
  }
}

export class BackupStorageRegistry {
  private readonly providers: Record<BackupProvider, BackupStorageProvider>;

  constructor() {
    this.providers = {
      LOCAL: new LocalStorageProvider(),
      S3: new S3CompatibleStorageProvider("S3"),
      R2: new S3CompatibleStorageProvider("R2"),
      BACKBLAZE: new S3CompatibleStorageProvider("BACKBLAZE"),
    };
  }

  get(provider: BackupProvider): BackupStorageProvider {
    return this.providers[provider];
  }

  /** حالة كل المزوّدات - لـ/backup/health وشاشة الإعدادات */
  statusList(): {
    provider: BackupProvider;
    configured: boolean;
    credentialsDetected: boolean;
  }[] {
    return (Object.keys(this.providers) as BackupProvider[]).map((key) => {
      const p = this.providers[key];
      return {
        provider: p.provider,
        configured: p.configured,
        credentialsDetected: p.credentialsDetected,
      };
    });
  }
}
