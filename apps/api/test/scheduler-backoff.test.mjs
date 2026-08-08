import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createBackoff,
  recordFailure,
  recordSuccess,
  shouldSkip,
} from "../dist/utils/scheduler-backoff.js";

/**
 * حراسة تراجع المجدولات — مبنيّة على الحادثة الفعلية.
 *
 * القياس من جهاز المستخدم: نافذة انقطاع 15 دقيقة أنتجت 119 فشلاً مجدولاً،
 * 100% منها داخل نوافذ انقطاع شبكة وصفر خارجها. هذه الاختبارات تحرس أن
 * السلوك الطبيعي لم يتغيّر، وأن الضجيج انحسر، وأن التعافي فوري.
 */

const NOTIF_INTERVAL = 10_000;

test("التشغيل الطبيعي لا يتأثّر إطلاقاً", () => {
  const s = createBackoff();
  for (let i = 0; i < 100; i++) {
    assert.equal(shouldSkip(s), false, "دورة ناجحة لا تُتخطّى أبداً");
    assert.equal(recordSuccess(s), null, "لا يُكتب سطر عند النجاح المعتاد");
  }
});

test("أوّل فشل يُسجَّل كاملاً — لا يُبتلع", () => {
  const s = createBackoff();
  const note = recordFailure(s, NOTIF_INTERVAL, 0);
  assert.ok(note, "أوّل فشل يجب أن يُنتج سطراً");
  assert.match(note, /10 ثانية/);
});

test("التراجع أسّي ومحدود بسقف", () => {
  const s = createBackoff();
  const delays = [];
  let now = 0;
  for (let i = 0; i < 12; i++) {
    recordFailure(s, NOTIF_INTERVAL, now);
    delays.push(s.nextAttemptAt - now);
    now = s.nextAttemptAt;
  }
  assert.deepEqual(delays.slice(0, 5), [10_000, 20_000, 40_000, 80_000, 160_000]);
  assert.ok(
    delays.every((d) => d <= 5 * 60_000),
    "لا يتجاوز أي تأخير السقف (5 دقائق)",
  );
  assert.equal(delays.at(-1), 5 * 60_000, "يستقرّ عند السقف فيبقى النظام مستجيباً");
});

test("الحادثة الفعلية: 15 دقيقة انقطاع — كم دورة كانت ستُحاوَل", () => {
  const s = createBackoff();
  const WINDOW_MS = 15 * 60_000; // 14:55:22 → 15:10:04 على جهاز المستخدم
  let attempts = 0;
  let skipped = 0;

  for (let t = 0; t < WINDOW_MS; t += NOTIF_INTERVAL) {
    if (shouldSkip(s, t)) {
      skipped++;
      continue;
    }
    attempts++;
    recordFailure(s, NOTIF_INTERVAL, t);
  }

  const withoutBackoff = WINDOW_MS / NOTIF_INTERVAL; // 90 دورة
  assert.equal(withoutBackoff, 90);
  assert.ok(attempts < 12, `المحاولات ${attempts} يجب أن تقلّ كثيراً عن 90`);
  assert.equal(attempts + skipped, withoutBackoff, "لا دورة ضائعة من الحساب");
});

test("التعافي فوري ويُسجَّل مرّة واحدة", () => {
  const s = createBackoff();
  recordFailure(s, NOTIF_INTERVAL, 0);
  shouldSkip(s, 1000);
  shouldSkip(s, 2000);

  const msg = recordSuccess(s);
  assert.ok(msg, "التعافي يجب أن يُسجَّل");
  assert.match(msg, /استُؤنف/);
  assert.match(msg, /2 دورة مُتخطّاة/);

  assert.equal(shouldSkip(s), false, "بعد التعافي تعود الدورات فوراً");
  assert.equal(recordSuccess(s), null, "ولا يتكرّر سطر التعافي");
});

test("انتهاء التراجع يسمح بمحاولة جديدة", () => {
  const s = createBackoff();
  recordFailure(s, NOTIF_INTERVAL, 0);
  assert.equal(shouldSkip(s, 9_999), true, "قبل انتهاء المهلة يُتخطّى");
  assert.equal(shouldSkip(s, 10_000), false, "عند انتهائها يُحاوَل");
});

// ==================== حراسة إضافية (تدقيق التجمّع) ====================

test("سلّم الإخفاقات: 1 · 2 · 3 · 5 · 10 — التأخير الفعلي المُنتَج", () => {
  // 10s · 2^(n-1) بسقف 5 دقائق: 10, 20, 40, 80, 160, 300, 300…
  const expected = { 1: 10_000, 2: 20_000, 3: 40_000, 5: 160_000, 10: 300_000 };

  for (const [n, wantDelay] of Object.entries(expected)) {
    const s = createBackoff();
    let now = 0;
    let lastDelay = 0;

    for (let i = 0; i < Number(n); i++) {
      recordFailure(s, NOTIF_INTERVAL, now);
      lastDelay = s.nextAttemptAt - now; // التأخير الذي أنتجه الكود فعلاً
      now = s.nextAttemptAt;
    }

    assert.equal(s.failures, Number(n), `عدّاد الإخفاقات عند ${n}`);
    assert.equal(lastDelay, wantDelay, `التأخير بعد ${n} إخفاق`);
    assert.ok(lastDelay <= 5 * 60_000, `السقف محترم عند ${n}`);
  }
});

test("فشل بعد تعافٍ يبدأ السلّم من جديد", () => {
  const s = createBackoff();
  for (let i = 0; i < 8; i++) recordFailure(s, NOTIF_INTERVAL, i * 1000);
  assert.ok(s.failures === 8);

  recordSuccess(s);
  assert.equal(s.failures, 0);

  recordFailure(s, NOTIF_INTERVAL, 0);
  assert.equal(s.failures, 1, "العدّاد صُفِّر");
  assert.equal(s.nextAttemptAt, 10_000, "التأخير عاد للقيمة الابتدائية لا للسقف");
});

test("عزل الحالة بين مجدولين — لا تسرّب", () => {
  const notif = createBackoff();
  const backup = createBackoff();

  for (let i = 0; i < 6; i++) recordFailure(notif, 10_000, i * 1000);

  assert.equal(backup.failures, 0, "مجدول النسخ لم يتأثّر");
  assert.equal(shouldSkip(backup), false, "ولا يُتخطّى بسببه");
  assert.ok(notif.failures === 6);
});

test("الحالة لا تنمو بلا حدّ — لا تسريب ذاكرة", () => {
  const s = createBackoff();
  for (let i = 0; i < 100_000; i++) recordFailure(s, NOTIF_INTERVAL, i);
  // الحالة ثلاثة أعداد فقط مهما طال الانقطاع
  assert.deepEqual(Object.keys(s).sort(), ["failures", "nextAttemptAt", "suppressed"]);
  assert.equal(typeof s.failures, "number");
  assert.ok(s.nextAttemptAt - 99_999 <= 5 * 60_000, "التأخير محدود بالسقف دائماً");
});

test("shouldSkip لا يغيّر الحالة عند التشغيل السليم", () => {
  const s = createBackoff();
  const before = { ...s };
  for (let i = 0; i < 50; i++) shouldSkip(s, i * 1000);
  assert.deepEqual({ ...s }, before, "لا أثر جانبي حين لا يوجد فشل");
});
