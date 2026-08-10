import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { env } from "../../config/env.js";

/**
 * عميل Backblaze B2 عبر واجهته الأصلية و`fetch` — بلا SDK.
 *
 * لماذا لا @aws-sdk/client-s3 رغم أن B2 يوفّر واجهة متوافقة مع S3: الحزمة
 * وتبعيّاتها عشرات الميغابايت تُشحن داخل تطبيق سطح المكتب أيضاً، مقابل ثلاثة
 * نداءات HTTP لا أكثر. والتوقيع في واجهة B2 الأصلية رأس Basic بسيط، بينما
 * توقيع SigV4 لواجهة S3 هو ما يستدعي SDK فعلاً.
 *
 * ملفات النسخ هنا عشرات الكيلوبايتات، فالرفع بنداء واحد كافٍ ولا حاجة للتقسيم
 * (B2 يقبل حتى 5 غيغابايت في نداء واحد). لو كبرت البيانات يوماً حتى تجاوزت
 * ذلك، فالمكان الصحيح للتقسيم هو uploadFile وحدها.
 */

const AUTH_URL = "https://api.backblazeb2.com/b2api/v3/b2_authorize_account";
/** مهلة كل نداء — لا يتجمّد إنشاء نسخة لأن السحابة لا تستجيب */
const REQUEST_TIMEOUT_MS = 30_000;
/** رمز التفويض صالح 24 ساعة؛ نجدّده قبلها بهامش */
const AUTH_TTL_MS = 20 * 60 * 60_000;

interface AuthState {
  apiUrl: string;
  downloadUrl: string;
  token: string;
  accountId: string;
  /** الـbucket المسموح للمفتاح إن كان محصوراً بواحد — يوفّر نداء b2_list_buckets */
  allowedBucketId: string | null;
  allowedBucketName: string | null;
  expiresAt: number;
}

export interface B2Config {
  keyId: string;
  appKey: string;
  bucket: string;
}

/** الإعداد إن كانت المتغيّرات الثلاثة موجودة كلها، وإلا null */
export function readB2Config(): B2Config | null {
  const keyId = env.BACKUP_B2_KEY_ID?.trim();
  const appKey = env.BACKUP_B2_APP_KEY?.trim();
  const bucket = env.BACKUP_B2_BUCKET?.trim();
  if (!keyId || !appKey || !bucket) return null;
  return { keyId, appKey, bucket };
}

/** خطأ تخزين سحابي — يميّزه المستدعي عن أخطاء القرص المحلي */
export class B2Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "B2Error";
  }
}

async function request(url: string, init: RequestInit): Promise<Response> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) {
    // نصّ B2 إنجليزي تقنيّ — يُسجَّل للتشخيص ولا يُعرَض للمستخدم كما هو
    const body = await res.text().catch(() => "");
    throw new B2Error(`B2 ${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
  }
  return res;
}

export class B2Client {
  private auth: AuthState | null = null;
  private bucketId: string | null = null;

  constructor(private readonly config: B2Config) {}

  /**
   * رمز التفويض مُخزَّن ويُعاد استخدامه: كل نداء يبدأ بتفويض جديد يعني ضعف
   * زمن كل عملية ورحلة شبكة زائدة بلا سبب.
   */
  private async authorize(): Promise<AuthState> {
    if (this.auth && Date.now() < this.auth.expiresAt) return this.auth;

    const basic = Buffer.from(`${this.config.keyId}:${this.config.appKey}`).toString("base64");
    const res = await request(AUTH_URL, { headers: { Authorization: `Basic ${basic}` } });
    const body = (await res.json()) as {
      authorizationToken: string;
      accountId: string;
      apiInfo: {
        storageApi: {
          apiUrl: string;
          downloadUrl: string;
          bucketId?: string | null;
          bucketName?: string | null;
        };
      };
    };
    const api = body.apiInfo.storageApi;

    this.auth = {
      token: body.authorizationToken,
      accountId: body.accountId,
      apiUrl: api.apiUrl,
      downloadUrl: api.downloadUrl,
      allowedBucketId: api.bucketId ?? null,
      allowedBucketName: api.bucketName ?? null,
      expiresAt: Date.now() + AUTH_TTL_MS,
    };
    return this.auth;
  }

  /**
   * مُعرِّف الـbucket من اسمه — يُحلّ مرّة واحدة ويُخزَّن.
   *
   * المفتاح المحصور ببucket واحد يعيد مُعرِّفه ضمن ردّ التفويض نفسه، فلا داعي
   * لنداء b2_list_buckets (وهو نداء لا يسمح به مفتاح محصور أصلاً في الغالب).
   */
  private async resolveBucketId(): Promise<string> {
    if (this.bucketId) return this.bucketId;
    const auth = await this.authorize();

    if (auth.allowedBucketId) {
      if (auth.allowedBucketName && auth.allowedBucketName !== this.config.bucket) {
        throw new B2Error(
          `المفتاح محصور بـbucket «${auth.allowedBucketName}» بينما الإعداد يطلب «${this.config.bucket}»`,
        );
      }
      this.bucketId = auth.allowedBucketId;
      return this.bucketId;
    }

    // مفتاح غير محصور (وصول لكل الـbuckets) — نبحث عن الاسم المطلوب
    const res = await request(`${auth.apiUrl}/b2api/v3/b2_list_buckets`, {
      method: "POST",
      headers: { Authorization: auth.token, "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: auth.accountId, bucketName: this.config.bucket }),
    });
    const body = (await res.json()) as { buckets: { bucketId: string; bucketName: string }[] };
    const found = body.buckets.find((b) => b.bucketName === this.config.bucket);
    if (!found) {
      throw new B2Error(`الـbucket «${this.config.bucket}» غير موجود أو المفتاح لا يصل إليه`);
    }
    this.bucketId = found.bucketId;
    return found.bucketId;
  }

  /** يرفع ملفاً محلياً ويعيد اسمه في الـbucket */
  async uploadFile(localPath: string, remoteName: string): Promise<string> {
    const auth = await this.authorize();
    const bucketId = await this.resolveBucketId();

    const urlRes = await request(`${auth.apiUrl}/b2api/v3/b2_get_upload_url`, {
      method: "POST",
      headers: { Authorization: auth.token, "Content-Type": "application/json" },
      body: JSON.stringify({ bucketId }),
    });
    const { uploadUrl, authorizationToken } = (await urlRes.json()) as {
      uploadUrl: string;
      authorizationToken: string;
    };

    const data = await readFile(localPath);
    // B2 يتحقّق من sha1 عند الاستلام ويرفض الملف إن اختلف — سلامة الرفع مضمونة
    // من الطرفين، لا من ردّ الخادم وحده.
    const sha1 = createHash("sha1").update(data).digest("hex");

    await request(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: authorizationToken,
        "X-Bz-File-Name": encodeURIComponent(remoteName),
        "Content-Type": "application/octet-stream",
        "Content-Length": String(data.byteLength),
        "X-Bz-Content-Sha1": sha1,
      },
      body: new Uint8Array(data),
    });

    return remoteName;
  }

  /** ينزّل ملفاً من الـbucket — الـbucket خاص فيلزم رمز التفويض */
  async downloadFile(remoteName: string): Promise<Buffer> {
    const auth = await this.authorize();
    const url = `${auth.downloadUrl}/file/${encodeURIComponent(this.config.bucket)}/${encodeURIComponent(remoteName)}`;
    const res = await request(url, { headers: { Authorization: auth.token } });
    return Buffer.from(await res.arrayBuffer());
  }

  /**
   * يحذف كل إصدارات ملف. B2 يحتفظ بإصدارات، فحذف الإصدار الأحدث وحده يترك
   * الملف قائماً ويستمرّ في استهلاك المساحة والفوترة.
   */
  async deleteFile(remoteName: string): Promise<void> {
    const auth = await this.authorize();
    const bucketId = await this.resolveBucketId();

    const listRes = await request(`${auth.apiUrl}/b2api/v3/b2_list_file_versions`, {
      method: "POST",
      headers: { Authorization: auth.token, "Content-Type": "application/json" },
      body: JSON.stringify({ bucketId, startFileName: remoteName, prefix: remoteName, maxFileCount: 100 }),
    });
    const { files } = (await listRes.json()) as { files: { fileId: string; fileName: string }[] };

    for (const file of files.filter((f) => f.fileName === remoteName)) {
      await request(`${auth.apiUrl}/b2api/v3/b2_delete_file_version`, {
        method: "POST",
        headers: { Authorization: auth.token, "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.fileId, fileName: file.fileName }),
      });
    }
  }

  /** فحص اتصال حقيقي — تفويض + وجود الـbucket. للاستخدام في /backup/health */
  async probe(): Promise<void> {
    await this.resolveBucketId();
  }
}
