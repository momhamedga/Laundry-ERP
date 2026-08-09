import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

/**
 * حراسة تصنيف الأخطاء في المعالج المركزي.
 *
 * قياسان أُثبتا حيّاً على خادم يعمل:
 *  - حمولة تتجاوز 1MB كانت تُرجِع 500 ورسالة «خطأ غير متوقّع في النظام»، وهي
 *    إفادة خاطئة: الخطأ من العميل لا الخادم. وكل طلب كبير كان يكتب سطر
 *    «Unhandled error» فيصير إغراق السجلّ ممكناً بطلبات بلا مصادقة.
 *  - انقطاع قاعدة البيانات يظهر بالكود P2024 لا P1001، وقد أثبته سجلّ جهاز
 *    المستخدم بعد أن أخفقت الفرضية الأولى.
 */
const SRC = readFileSync(new URL("../src/middlewares/error.middleware.ts", import.meta.url), "utf8");

test("أخطاء تحليل الجسم تحتفظ بحالتها ولا تصير 500", () => {
  assert.match(SRC, /entity\./, "يجب التعرّف على أخطاء body-parser عبر type");
  assert.match(SRC, /413/, "يجب التمييز بين تجاوز الحجم وغيره");
  const idx = SRC.indexOf("entity.");
  const generic = SRC.indexOf('console.error("💥');
  assert.ok(idx > 0 && idx < generic, "الفحص يجب أن يسبق المعالج العام وإلا لم يُستخدم");
});

test("P2024 مصنَّف كانقطاع قاعدة بيانات", () => {
  assert.match(SRC, /P2024/, "الكود الذي يظهر فعلياً عند انقطاع الإنترنت");
  assert.match(SRC, /P1001/, "أخطاء الاتصال المباشرة أيضاً");
});

test("أخطاء العميل الحقيقية لا تُخفى خلف رسالة القاعدة", () => {
  assert.doesNotMatch(SRC, /P2002|P2025/, "تكرار السجلّ وعدم وجوده ليسا انقطاعاً");
});
