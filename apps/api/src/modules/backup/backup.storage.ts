import type { BackupProvider } from "@prisma/client";
import { B2Client, readB2Config } from "./backup.b2.js";

/**
 * مزوّدو تخزين النسخ (Strategy Pattern).
 *
 * كان هنا ثلاثة مزوّدين سحابيين (S3 وR2 وBackblaze) كلّهم هياكل فارغة:
 * configured=false دائماً، وpersist() ترمي «SDK integration pending»، ولا
 * مستدعٍ لها أصلاً. أي أن اختيار مزوّد سحابي من الإعدادات كان يتراجع إلى
 * LOCAL بصمت — يرى المستخدم اسم مزوّده في القائمة ويظنّ نسخه في السحابة.
 *
 * الآن مزوّدان اثنان فقط، وكلاهما حقيقي: LOCAL وB2. حُذف S3 وR2 لأن وجود خيار
 * لا يعمل أسوأ من غيابه. (قيمتاهما باقيتان في enum قاعدة البيانات ولا تظهران
 * في أي واجهة — إزالتهما تستلزم ترحيلاً على الإنتاج مقابل مكسب شكلي.)
 */
export interface BackupStorageProvider {
  readonly provider: BackupProvider;
  /** جاهز للاستخدام فعلياً */
  readonly configured: boolean;
  /** رُصدت أسرار بالبيئة — للتمييز بين «غير مُعَدّ» و«مُعَدّ لكنه يفشل» */
  readonly credentialsDetected: boolean;
  /** يرفع الملف المكتوب محلياً ويعيد اسمه البعيد؛ LOCAL يعيد المسار كما هو */
  persist(localFilePath: string, remoteName: string): Promise<string>;
  /** يجلب الملف من التخزين البعيد؛ LOCAL يرمي (يُقرأ من القرص مباشرةً) */
  fetch(remoteName: string): Promise<Buffer>;
  /** يحذف الملف من التخزين البعيد؛ LOCAL لا شيء (يُحذف من القرص) */
  remove(remoteName: string): Promise<void>;
  /** فحص اتصال حقيقي — لا مجرّد «هل الأسرار موجودة» */
  probe(): Promise<void>;
}

/** التخزين المحلي — الملف مكتوب أصلاً بمجلد النسخ، لا خطوة إضافية */
class LocalStorageProvider implements BackupStorageProvider {
  readonly provider = "LOCAL" as const;
  readonly configured = true;
  readonly credentialsDetected = true;

  persist(localFilePath: string): Promise<string> {
    return Promise.resolve(localFilePath);
  }
  fetch(): Promise<Buffer> {
    return Promise.reject(new Error("التخزين المحلي يُقرأ من القرص مباشرةً"));
  }
  remove(): Promise<void> {
    return Promise.resolve();
  }
  probe(): Promise<void> {
    return Promise.resolve();
  }
}

/** Backblaze B2 — تكامل حقيقي عبر واجهة B2 الأصلية (راجع backup.b2.ts) */
class B2StorageProvider implements BackupStorageProvider {
  readonly provider = "BACKBLAZE" as const;
  private readonly client: B2Client | null;

  constructor() {
    const config = readB2Config();
    this.client = config ? new B2Client(config) : null;
  }

  get configured(): boolean {
    return this.client !== null;
  }
  get credentialsDetected(): boolean {
    return this.client !== null;
  }

  private require(): B2Client {
    if (!this.client) throw new Error("تخزين Backblaze غير مُعَدّ (متغيّرات BACKUP_B2_* ناقصة)");
    return this.client;
  }

  persist(localFilePath: string, remoteName: string): Promise<string> {
    return this.require().uploadFile(localFilePath, remoteName);
  }
  fetch(remoteName: string): Promise<Buffer> {
    return this.require().downloadFile(remoteName);
  }
  remove(remoteName: string): Promise<void> {
    return this.require().deleteFile(remoteName);
  }
  probe(): Promise<void> {
    return this.require().probe();
  }
}

export class BackupStorageRegistry {
  private readonly local = new LocalStorageProvider();
  private readonly b2 = new B2StorageProvider();

  /**
   * S3 وR2 لم يعودا مدعومين؛ سجلٌّ قديم يحمل إحداهما (لا يوجد أيٌّ منها فعلياً)
   * يُعامَل كمحلّي بدل أن يُسقط الطلب.
   */
  get(provider: BackupProvider): BackupStorageProvider {
    return provider === "BACKBLAZE" ? this.b2 : this.local;
  }

  /** حالة المزوّدين — لـ/backup/health وشاشة الإعدادات */
  statusList(): {
    provider: BackupProvider;
    configured: boolean;
    credentialsDetected: boolean;
  }[] {
    return [this.local, this.b2].map((p) => ({
      provider: p.provider,
      configured: p.configured,
      credentialsDetected: p.credentialsDetected,
    }));
  }

  /** فحص اتصال حقيقي بالمزوّد السحابي — يعيد رسالة الخطأ إن فشل */
  async probeCloud(): Promise<{ configured: boolean; ok: boolean; error: string | null }> {
    if (!this.b2.configured) return { configured: false, ok: false, error: null };
    try {
      await this.b2.probe();
      return { configured: true, ok: true, error: null };
    } catch (err) {
      return { configured: true, ok: false, error: err instanceof Error ? err.message : "خطأ غير معروف" };
    }
  }
}
