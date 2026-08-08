import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * حراسة ترقيم ملء الكاش.
 *
 * طلبت النسخة الأولى limit=500 فردّ الخادم 400 (حدّه 100)، وابتلع catch
 * الخطأ فبقي الكاش فارغاً. لم يظهر ذلك في أي فحص آلي — لا في الأنواع ولا
 * اللينت ولا البناء — بل حين قطع المستخدم الإنترنت على جهازه فلم يجد عميلاً
 * واحداً. هذه الاختبارات تحرس الشرطين اللذين لو اختلّ أحدهما عاد العطل.
 */

const SRC = readFileSync(new URL("../src/lib/offline-cache-sync.ts", import.meta.url), "utf8");

/** MAX_PAGE_SIZE في الخادم — أي limit فوقه يُرفض بـ 400 */
const SERVER_MAX_PAGE_SIZE = 100;

test("لا يُطلب من الخادم limit فوق حدّه", () => {
  const limits = [...SRC.matchAll(/limit:\s*(\d+)/g)].map((m) => Number(m[1]));
  const pageConst = [...SRC.matchAll(/const PAGE\s*=\s*(\d+)/g)].map((m) => Number(m[1]));

  for (const n of [...limits, ...pageConst]) {
    assert.ok(
      n <= SERVER_MAX_PAGE_SIZE,
      `limit=${n} يتجاوز حدّ الخادم ${SERVER_MAX_PAGE_SIZE} وسيُرفض بـ 400`,
    );
  }
});

test("الفشل يُسجَّل ولا يُبتلع صامتاً", () => {
  const silent = [...SRC.matchAll(/\}\s*catch\s*\{/g)];
  assert.equal(
    silent.length,
    0,
    "كل catch يجب أن يلتقط الخطأ ويُسجّله — الصمت هو ما أخفى العطل الأول",
  );
  assert.ok(SRC.includes("warn("), "يجب استدعاء warn لتسجيل الفشل");
});

test("الجلب يمرّ بكل الصفحات لا بالأولى وحدها", () => {
  assert.ok(SRC.includes("fetchAllPages"), "يجب وجود جامع صفحات");
  assert.ok(/totalPages/.test(SRC), "يجب احترام totalPages القادم من الخادم");
  assert.ok(/MAX_ROWS/.test(SRC), "يجب وجود سقف يمنع سحب قاعدة ضخمة");
});
