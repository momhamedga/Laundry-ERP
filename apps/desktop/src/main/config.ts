import { app } from "electron";
import path from "node:path";

/**
 * إعدادات مركزية للـ Main Process: البيئة، المنافذ، الروابط، ومسارات الموارد
 * المُجمّعة عند التغليف. لا أسرار هنا (الأسرار تبقى في .env الخاص بالـ API).
 */

export const IS_DEV =
  process.env.DESKTOP_ENV === "development" || !app.isPackaged;

/** منفذ الـ API المحلي (يطابق افتراضي config/env.ts في الـ backend) */
export const API_PORT = Number(process.env.DESKTOP_API_PORT ?? 4000);
export const API_HEALTH_URL = `http://127.0.0.1:${API_PORT}/api/v1/health`;
export const API_ORIGIN = `http://127.0.0.1:${API_PORT}`;

/**
 * ⚠️ نفس المصيدة أدناه، لكن من جهة CSP هذه المرّة.
 *
 * الواجهة مبنيّة على `NEXT_PUBLIC_API_URL=http://localhost:4000`، بينما
 * `API_ORIGIN` يستخدم `127.0.0.1`. المتصفّح يعتبرهما **أصلين مختلفين**، فسياسة
 * `connect-src` التي تسمح بـ 127.0.0.1 وحده كانت تحجب كل طلب من الواجهة قبل أن
 * يغادر — لا أثر له في سجلّ الخادم، ورسالة "تعذّر الاتصال" تُرسل المستخدم يفحص
 * شبكته. النتيجة: تسجيل الدخول مستحيل في النسخة المُغلَّفة.
 *
 * نسمح بالصيغتين: العنوان الذي نستدعيه نحن داخلياً (127.0.0.1) والعنوان الذي
 * تستدعيه الواجهة (localhost).
 */
export const API_ORIGINS = [API_ORIGIN, `http://localhost:${API_PORT}`];

/** منفذ الـ Renderer (Next) في التطوير - خادم Next dev القائم */
export const DEV_RENDERER_URL =
  process.env.DESKTOP_RENDERER_URL ?? "http://localhost:3000";

/**
 * منفذ الـ Renderer المُضمَّن (Next standalone) في الإنتاج.
 *
 * ⚠️ المضيف هنا **localhost** وليس 127.0.0.1 عمداً: واجهة الـ Admin مبنيّة على
 * NEXT_PUBLIC_API_URL=http://localhost:4000، وكوكي الـ refresh يُضبط
 * SameSite=Strict. المتصفّح يعتبر `127.0.0.1` و`localhost` **موقعين مختلفين**،
 * فلو قدّمنا الواجهة على 127.0.0.1 لأصبح طلب تسجيل الدخول cross-site ولأُسقط
 * الكوكي بصمت ⇒ "انتهت الجلسة" فور الدخول. توحيد المضيف يبقي الطلب same-site.
 */
export const PROD_RENDERER_PORT = Number(process.env.DESKTOP_RENDERER_PORT ?? 3100);
export const PROD_RENDERER_HOST = "localhost";
export const PROD_RENDERER_URL = `http://${PROD_RENDERER_HOST}:${PROD_RENDERER_PORT}`;

/** أصول التنقّل المسموح بها داخل النافذة (حماية: منع أي navigation خارجها) */
export function allowedNavigationOrigins(): string[] {
  return [DEV_RENDERER_URL, PROD_RENDERER_URL, ...API_ORIGINS].map((u) => new URL(u).origin);
}

/** مجلد الموارد المُجمّعة عند التغليف (extraResources) */
function resourcesRoot(): string {
  return IS_DEV
    ? path.resolve(__dirname, "..", "..", "resources")
    : process.resourcesPath;
}

/** مسار خادم الـ API المُجمّع (الإنتاج): resources/api/dist/server.js */
export function bundledApiEntry(): string {
  return path.join(resourcesRoot(), "api", "dist", "server.js");
}
export function bundledApiCwd(): string {
  return path.join(resourcesRoot(), "api");
}

/**
 * مسار خادم Next standalone المُجمّع (الإنتاج). خرج standalone في monorepo يحفظ
 * مسار مساحة العمل، فالخادم عند resources/renderer/apps/admin/server.js، وجذر
 * التشغيل (cwd) هو جذر standalone (resources/renderer) حيث node_modules المُتتبَّعة.
 */
export function bundledRendererEntry(): string {
  return path.join(resourcesRoot(), "renderer", "apps", "admin", "server.js");
}
export function bundledRendererCwd(): string {
  return path.join(resourcesRoot(), "renderer");
}

export const APP_PROTOCOL = "laundry-erp"; // Deep-linking ready: laundry-erp://...
export const SINGLE_INSTANCE = true;

/**
 * مسار أيقونة التطبيق (Phase 12.2) — تُستخدم لضبط أيقونة نوافذ Electron وقت
 * التشغيل (شريط المهام + عنوان النافذة)، بمعزل عن تضمين الأيقونة داخل موارد
 * ملفّ الـexe نفسه (الذي يتطلّب rcedit/signAndEditExecutable، معطَّل حالياً - راجع
 * electron-builder.yml). مُغلَّفة: resources/build/icon.*؛ تطوير: apps/desktop/build/icon.*.
 */
export function appIconPath(): string {
  const file = process.platform === "win32" ? "icon.ico" : "icon.png";
  return IS_DEV
    ? path.resolve(__dirname, "..", "..", "build", file)
    : path.join(process.resourcesPath, "build", file);
}
