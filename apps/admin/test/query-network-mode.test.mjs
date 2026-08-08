import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * حراسة networkMode.
 *
 * الافتراضي في TanStack Query هو "online": حين يصير navigator.onLine مساوياً
 * false تُجمَّد الاستعلامات ولا تُستدعى دوالّ الجلب إطلاقاً. أثر ذلك أن طبقة
 * الأوفلاين كلها — الموجّه وSQLite والكاش — تصبح غير قابلة للوصول: لا سطر في
 * السجلّ، ولا قراءة محلّية، وقائمة فارغة أمام المستخدم.
 *
 * كلّف هذا خمس دورات بناء واختبار حيّ قبل أن يُكتشف، لأن كل شيء آخر كان
 * سليماً ولم يترك الإعداد أي أثر يُتتبَّع.
 */

const SRC = readFileSync(new URL("../src/lib/query-client.ts", import.meta.url), "utf8");

test("الاستعلامات لا تُجمَّد عند انقطاع الشبكة", () => {
  assert.match(
    SRC,
    /queries:\s*\{[^}]*networkMode:\s*["']always["']/s,
    'يجب أن تحمل الاستعلامات networkMode: "always" وإلا تُجمَّد ولا يُسأل موجّه الأوفلاين',
  );
});

test("الكتابات المحلّية لا تُجمَّد", () => {
  assert.match(
    SRC,
    /mutations:\s*\{[^}]*networkMode:\s*["']always["']/s,
    'إنشاء الطلب والدفعة كتابات محلّية دون اتصال — تجميدها يمنعها تماماً',
  );
});

test("لا عودة إلى الافتراض المُجمِّد", () => {
  assert.doesNotMatch(
    SRC,
    /networkMode:\s*["'](online|offlineFirst)["']/,
    '"online" يوقف الاستعلامات عند انقطاع الشبكة — هو العطل الذي نحرس منه',
  );
});
