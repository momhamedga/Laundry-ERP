import { shell, type Session, type WebContents } from "electron";
import { allowedNavigationOrigins } from "./config.js";
import { scoped } from "./logger.js";

const log = scoped("security");

/**
 * تصليب أمني على مستوى webContents (يُطبَّق على كل نافذة):
 * - منع فتح نوافذ جديدة داخلياً؛ الروابط الخارجية تُفتح بالمتصفح الافتراضي بأمان.
 * - منع أي navigation خارج الأصول المسموح بها (renderer/api المحلي فقط).
 * - منع إرفاق <webview> أو أي محتوى مضمّن غير موثوق.
 */
export function hardenWebContents(contents: WebContents): void {
  const allowed = allowedNavigationOrigins();

  // فتح نوافذ جديدة: ارفض داخلياً، وافتح http/https الموثوقة خارجياً
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    else log.warn("blocked window.open for non-http url:", url);
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
}
