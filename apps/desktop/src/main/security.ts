import { shell, type Session, type WebContents } from "electron";
import { allowedNavigationOrigins } from "./config.js";
import { scoped } from "./logger.js";

const log = scoped("security");

/**
 * سياسة أمان المحتوى (CSP) — دفاع في العمق فوق العزل/الـsandbox (v1.3.0).
 * تمنع تحميل أي سكربت/اتّصال/كائن من مضيف خارجي: script/connect محصورة في
 * الأصول المحلّية المعروفة (الواجهة + الـAPI المحلي + WS للتطوير). يُسمح بـ
 * inline/eval لأن Next.js يحتاجهما للترطيب، لكن لا مضيف خارجي إطلاقاً (يقطع RCE
 * عن بُعد عبر حقن سكربت). object/frame-ancestors ممنوعة.
 */
function buildCsp(): string {
  const origins = allowedNavigationOrigins().join(" ");
  return [
    "default-src 'self' blob:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${origins} ws: wss:`,
    "object-src 'none'",
    // مستندات PDF التي يولّدها التطبيق تُفتح كـ blob: في نافذة مستقلّة
    "frame-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/**
 * تصليب أمني على مستوى webContents (يُطبَّق على كل نافذة):
 * - منع فتح نوافذ جديدة داخلياً؛ الروابط الخارجية تُفتح بالمتصفح الافتراضي بأمان.
 * - منع أي navigation خارج الأصول المسموح بها (renderer/api المحلي فقط).
 * - منع إرفاق <webview> أو أي محتوى مضمّن غير موثوق.
 */
export function hardenWebContents(contents: WebContents): void {
  const allowed = allowedNavigationOrigins();

  contents.setWindowOpenHandler(({ url }) => {
    /**
     * مستندات blob: يولّدها التطبيق نفسه (فاتورة PDF، إيصال دفع) ويفتحها
     * `openBlobInNewTab`. رفضها سابقاً كان يُعطّل «عرض PDF» و«تنزيل» و«طباعة»
     * بصمت — الـ API يُنتج الملفّ ثم تُحجب نافذة عرضه، فيرى المستخدم نافذة
     * سوداء أو لا شيء. المحتوى محلّي المنشأ ومن أصلنا، فنسمح بنافذة معاينة
     * مُصلَّبة بلا تكامل Node.
     */
    if (url.startsWith("blob:")) {
      const origin = url.slice("blob:".length);
      if (allowed.some((o) => origin.startsWith(o))) {
        return {
          action: "allow",
          overrideBrowserWindowOptions: {
            autoHideMenuBar: true,
            webPreferences: {
              contextIsolation: true,
              sandbox: true,
              nodeIntegration: false,
              // عارض PDF المدمج في Chromium مُعطَّل افتراضياً في Electron؛ بدونه
              // تُفتح النافذة فارغة تماماً بدل عرض الفاتورة. لا علاقة له بإضافات
              // خارجية — هو العارض الداخلي فقط.
              plugins: true,
            },
          },
        };
      }
      log.warn("blocked blob window from unexpected origin:", url.slice(0, 80));
      return { action: "deny" };
    }

    // روابط الويب تُفتح في المتصفّح الخارجي لا داخل التطبيق
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    else log.warn("blocked window.open for non-http url:", url.slice(0, 80));
    return { action: "deny" };
  });

  // منع الانتقال خارج الأصول المسموح بها
  contents.on("will-navigate", (event, url) => {
    try {
      const origin = new URL(url).origin;
      if (!allowed.includes(origin)) {
        event.preventDefault();
        if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
        log.warn("blocked navigation to:", url);
      }
    } catch {
      event.preventDefault();
    }
  });

  // لا webview مطلقاً
  contents.on("will-attach-webview", (event) => {
    event.preventDefault();
    log.warn("blocked <webview> attach");
  });
}

/**
 * سياسات على مستوى الجلسة: رفض طلبات الأذونات الحسّاسة افتراضياً (كاميرا/ميكروفون/
 * موقع…)، والسماح فقط بما يحتاجه التطبيق (إشعارات). تصليب زائد فوق العزل/الـsandbox.
 */
// إشعارات + الكاميرا (media) لالتقاط صور القطع/الباركود (Phase 11.6D). لا ميكروفون
// ولا موقع ولا غيرها. الكاميرا أصل وظيفي للمغسلة (توثيق الأغراض) لا اختراق خصوصية.
const ALLOWED_PERMISSIONS = new Set(["notifications", "media"]);

export function applySessionSecurity(session: Session): void {
  session.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });
  session.setPermissionCheckHandler((_wc, permission) => ALLOWED_PERMISSIONS.has(permission));

  // حقن رأس CSP على كل استجابة (دفاع في العمق) — v1.3.0
  const csp = buildCsp();
  session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    // أزل أي CSP سابق ثم اضبط سياستنا (تفادي التعارض)
    for (const k of Object.keys(responseHeaders)) {
      if (k.toLowerCase() === "content-security-policy") delete responseHeaders[k];
    }
    responseHeaders["Content-Security-Policy"] = [csp];
    callback({ responseHeaders });
  });
  log.info("session hardened (permissions + CSP)");
}
