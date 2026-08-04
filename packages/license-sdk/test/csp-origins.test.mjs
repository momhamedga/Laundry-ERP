/**
 * حارس انحدار لسياسة أمان المحتوى في تطبيق سطح المكتب.
 *
 * عطل حقيقي شُحن في v2.0.0: الواجهة مبنيّة على `NEXT_PUBLIC_API_URL` بمضيف
 * `localhost`، بينما `connect-src` كان يسمح بـ `127.0.0.1` وحده. المتصفّح
 * يعتبرهما أصلين مختلفين فحجب كل طلب قبل مغادرته — لا أثر في سجلّ الخادم،
 * وتسجيل الدخول مستحيل في النسخة المُغلَّفة. لم يكشفه أي اختبار لأن كل
 * اختبارات المصادقة كانت تضرب الـ API مباشرةً لا عبر الواجهة.
 *
 * هذه الاختبارات تقرأ المصدر نصّياً (وحدات Electron لا تُحمَّل خارج بيئتها)،
 * وتفشل إن عاد أي أصل تحتاجه الواجهة ليسقط من السياسة.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const config = fs.readFileSync(path.join(ROOT, "apps/desktop/src/main/config.ts"), "utf8");
const security = fs.readFileSync(path.join(ROOT, "apps/desktop/src/main/security.ts"), "utf8");

/** المضيف الذي تستدعيه الواجهة فعلاً، من ملفّ بيئتها. */
function rendererApiHost() {
  for (const f of ["apps/admin/.env.local", "apps/admin/.env.example"]) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, "utf8").match(/^NEXT_PUBLIC_API_URL\s*=\s*(.+)$/m);
    if (m) return new URL(m[1].trim()).origin;
  }
  // الافتراضي المكتوب في constants/config.ts
  const c = fs.readFileSync(path.join(ROOT, "apps/admin/src/constants/config.ts"), "utf8");
  const m = c.match(/["'`](https?:\/\/[^"'`]+)["'`]/);
  return m ? new URL(m[1]).origin : null;
}

test("أصول الـ API تشمل localhost و127.0.0.1 معاً", () => {
  assert.match(config, /API_ORIGINS/, "API_ORIGINS غير معرّف");
  assert.match(config, /http:\/\/127\.0\.0\.1:\$\{API_PORT\}/, "ينقص أصل 127.0.0.1");
  assert.match(config, /http:\/\/localhost:\$\{API_PORT\}/, "ينقص أصل localhost");
});

test("allowedNavigationOrigins تستخدم القائمة كاملة لا أصلاً واحداً", () => {
  const fn = config.match(/export function allowedNavigationOrigins[\s\S]*?\n}/)[0];
  assert.match(fn, /\.\.\.API_ORIGINS/, "يجب نشر API_ORIGINS كاملة");
  assert.doesNotMatch(fn, /,\s*API_ORIGIN\s*\]/, "لا تستخدم أصلاً مفرداً");
});

test("connect-src في CSP يُبنى من الأصول المسموح بها", () => {
  const csp = security.match(/function buildCsp[\s\S]*?\n}/)[0];
  assert.match(csp, /connect-src[^"]*\$\{origins\}/, "connect-src لا يشمل الأصول");
  assert.match(csp, /allowedNavigationOrigins\(\)/, "المصدر ليس allowedNavigationOrigins");
});

test("المضيف الذي تستدعيه الواجهة مسموح به فعلاً", () => {
  const host = rendererApiHost();
  assert.ok(host, "تعذّر تحديد NEXT_PUBLIC_API_URL");
  const hostname = new URL(host).hostname;
  assert.match(
    config,
    new RegExp(`http://${hostname.replace(/\./g, "\\.")}:\\$\\{API_PORT\\}`),
    `الواجهة تستدعي ${hostname} لكنه غير موجود في API_ORIGINS`,
  );
});

test("CSP تبقى مُصلَّبة: لا object-src ولا frame-ancestors مفتوحة", () => {
  const csp = security.match(/function buildCsp[\s\S]*?\n}/)[0];
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.doesNotMatch(csp, /connect-src[^;]*\*/, "connect-src يجب ألّا تحوي wildcard");
});
