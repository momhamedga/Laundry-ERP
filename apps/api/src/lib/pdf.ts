import puppeteer, { type Browser, type LaunchOptions } from "puppeteer";

/**
 * محرّك مشترك صامد لتحويل HTML → PDF عبر Chromium - يستهلكه أكثر من وحدة
 * (الفواتير: مستندات الفاتورة، المدفوعات: إيصالات الدفع) بمتصفح **واحد**
 * مُحصَّن لكل التطبيق (لا متصفح منفصل لكل وحدة = ذاكرة/سطح انهيار مضاعف).
 *
 * المشكلة الجذرية التي يعالجها هذا الملف:
 * المتصفح مفرد (Singleton) يُعاد استخدامه لكل الطلبات (الإقلاع بطيء ~1-2ث).
 * لكن عملية Chromium قد تنقطع لأي سبب (Crash / OOM / إغلاق قناة CDP / خمول)،
 * وحينها يبقى المفرد محتفظاً بمرجع "متصفح ميت" - فتفشل كل عمليات PDF للأبد
 * بـ500 حتى إعادة تشغيل السيرفر يدوياً. الحل هنا معماري لا مجرد إعادة تشغيل:
 *
 * - Browser Lifecycle: يُعاد إنشاؤه تلقائياً إذا فُقد (فحص connected + مستمع disconnected).
 * - Page Lifecycle: كل صفحة تُنشأ/تُستخدم/تُغلق داخل finally حصراً - لا تتراكم صفحات.
 * - Crash Recovery: عند (Target closed / disconnected / Protocol error / Connection closed)
 *   يُبطَل المتصفح ويُعاد إنشاؤه، ثم تُعاد العملية مرة واحدة فقط.
 * - Singleton سليم: لا يحتفظ بمرجع ميت ولا بوعد مرفوض (فشل الإقلاع لا يُخزَّن للأبد).
 * - Timeouts: حد أقصى لكل عملية - لا تجميد للطلب مهما تعطّل Chromium.
 * - Concurrency: طلبات متزامنة تتشارك متصفحاً واحداً وتفتح صفحة مستقلة لكلٍّ منها.
 * - Cleanup: closePdfBrowser() يُستدعى عند إيقاف السيرفر (SIGINT/SIGTERM) لإغلاق نظيف.
 */

// ==================== الحدود الزمنية ====================

/** مهلة إقلاع المتصفح */
const LAUNCH_TIMEOUT_MS = 30_000;
/** مهلة كل استدعاء بروتوكول منخفض المستوى (CDP) - يمنع تجميد استدعاء واحد للأبد */
const PROTOCOL_TIMEOUT_MS = 60_000;
/** مهلة عملية التحويل الكاملة (صفحة + محتوى + PDF) لكل طلب */
const RENDER_TIMEOUT_MS = 30_000;

const LAUNCH_OPTIONS: LaunchOptions = {
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
  timeout: LAUNCH_TIMEOUT_MS,
  protocolTimeout: PROTOCOL_TIMEOUT_MS,
};

// ==================== المفرد (Singleton) ====================

/** الوعد الوحيد للمتصفح - null يعني "لا متصفح، أنشئ عند الحاجة" */
let browserPromise: Promise<Browser> | null = null;

/**
 * يُعيد وعد المتصفح المفرد، ويُطلقه إن لم يوجد. الإطلاق يُرفق:
 * - مستمع disconnected لمرة واحدة يُصفِّر المفرد فور فقد الاتصال (تعافٍ تلقائي).
 * - catch يُصفِّر المفرد عند فشل الإقلاع (لا نُخزِّن وعداً مرفوضاً للأبد).
 * التعيين المتزامن لـ browserPromise يضمن أن الطلبات المتزامنة تتشارك إقلاعاً واحداً.
 */
function getBrowser(): Promise<Browser> {
  if (browserPromise) return browserPromise;

  const pending: Promise<Browser> = puppeteer
    .launch(LAUNCH_OPTIONS)
    .then((browser) => {
      // فقد الاتصال لأي سبب → أبطِل المفرد ليُعاد إنشاؤه بالطلب التالي.
      // once تضمن مستمعاً واحداً لكل متصفح (لا تتراكم المستمعات).
      browser.once("disconnected", () => {
        if (browserPromise === pending) browserPromise = null;
      });
      return browser;
    })
    .catch((err: unknown) => {
      if (browserPromise === pending) browserPromise = null;
      throw err;
    });

  browserPromise = pending;
  return pending;
}

/**
 * يُبطِل المتصفح الحالي: يُصفِّر المفرد أولاً (تزامنياً) ثم يُغلق المتصفح القديم
 * بأفضل جهد. التصفير المتزامن يمنع طلبين متزامنين من إغلاق نفس المتصفح مرتين.
 */
async function invalidateBrowser(): Promise<void> {
  const current = browserPromise;
  browserPromise = null;
  if (!current) return;
  try {
    const browser = await current;
    await browser.close().catch(() => undefined);
  } catch {
    // المتصفح لم يُقلع أصلاً (وعد مرفوض) - لا شيء لإغلاقه
  }
}

/** يُعيد متصفحاً حياً مضموناً - يُبطِل ويُعيد الإنشاء إن كان المفرد الحالي غير متصل */
async function acquireLiveBrowser(): Promise<Browser> {
  const browser = await getBrowser();
  if (browser.connected) return browser;
  // غير متصل لكن مستمع disconnected لم يُبطله بعد → أبطِل يدوياً وأعِد الإنشاء
  await invalidateBrowser();
  return getBrowser();
}

// ==================== أدوات التعافي ====================

class RenderTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenderTimeoutError";
  }
}

/** أخطاء تعني أن المتصفح مات/انقطع - قابلة للتعافي بإعادة الإنشاء + محاولة واحدة */
function isRecoverableBrowserError(err: unknown): boolean {
  if (err instanceof RenderTimeoutError) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /target closed|browser (?:has )?disconnected|protocol error|connection closed|session closed|websocket|browser process/i.test(
    message,
  );
}

/**
 * سباق بين العملية ومؤقّت - يضمن ألا تتجمد أي عملية للأبد. الطرف الخاسر
 * (العملية إن فاز المؤقّت) يُبتلع خطؤه لتفادي unhandledRejection معلّق.
 */
function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RenderTimeoutError(`${label} timed out after ${ms}ms`)), ms);
  });
  work.catch(() => undefined); // ابتلاع خطأ الطرف الخاسر
  return Promise.race([work, guard]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// ==================== التحويل ====================

/** خيارات تحويل اختيارية - كل الحقول لها افتراضي يطابق السلوك السابق تماماً (بلا كسر أي مستدعٍ حالي) */
export interface RenderHtmlToPdfOptions {
  /** أفقي - مفيد لجداول التقارير عريضة الأعمدة (Phase 5). الافتراضي false (portrait، كالفواتير) */
  landscape?: boolean;
  /**
   * ترقيم صفحات حقيقي (Phase 5 - تقارير متعددة الصفحات) عبر آلية Puppeteer
   * الأصلية (header/footerTemplate) - وليس CSS counters (لا تعمل بموثوقية عبر
   * صفحات print-to-pdf المتدفقة بكروميوم). span.pageNumber/totalPages خاصتان
   * بـPuppeteer نفسه. الافتراضي false - الفواتير/الإيصالات الحالية بلا تغيير
   */
  footerTemplate?: string;
}

/** محاولة تحويل واحدة: متصفح حي → صفحة جديدة → محتوى → PDF → إغلاق الصفحة دائماً */
async function renderOnce(html: string, options: RenderHtmlToPdfOptions): Promise<Buffer> {
  const browser = await acquireLiveBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load", timeout: RENDER_TIMEOUT_MS });
    const pdf = await page.pdf({
      format: "A4",
      landscape: options.landscape ?? false,
      printBackground: true,
      margin: options.footerTemplate
        ? { top: "20mm", bottom: "16mm", left: "15mm", right: "15mm" }
        : { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
      ...(options.footerTemplate
        ? { displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: options.footerTemplate }
        : {}),
    });
    return Buffer.from(pdf);
  } finally {
    // إغلاق الصفحة بأفضل جهد - لا يُخفي الخطأ الأصلي إن كان المتصفح ميتاً
    await page.close().catch(() => undefined);
  }
}

/**
 * يُحوِّل HTML لملف PDF حقيقي عبر Chromium - يضمن تصييراً صحيحاً للعربية RTL
 * (بنفس محرك المتصفح المستخدم أصلاً بواجهة المشروع). كل الصمود داخلي.
 *
 * عند فشل قابل للتعافي (انقطاع المتصفح أو تجاوز المهلة): يُبطَل المتصفح ويُعاد
 * إنشاؤه ثم تُعاد المحاولة **مرة واحدة فقط** (لا حلقات لا نهائية).
 */
export async function renderHtmlToPdf(
  html: string,
  options: RenderHtmlToPdfOptions = {},
): Promise<Buffer> {
  try {
    return await withTimeout(renderOnce(html, options), RENDER_TIMEOUT_MS, "PDF render");
  } catch (err) {
    if (!isRecoverableBrowserError(err)) throw err;
    await invalidateBrowser();
    return withTimeout(renderOnce(html, options), RENDER_TIMEOUT_MS, "PDF render (retry)");
  }
}

/** إغلاق نظيف للمتصفح عند إيقاف السيرفر - يمنع بقاء عمليات Chromium يتيمة (Zombie) */
export async function closePdfBrowser(): Promise<void> {
  await invalidateBrowser();
}
