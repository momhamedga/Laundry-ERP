/**
 * تراجع أسّي للمجدولات حين تتعذّر قاعدة البيانات.
 *
 * ═══════════ لماذا وُجد هذا ═══════════
 * المجدولان يعملان بفاصل ثابت (إشعارات 10s، نسخ 60s) بقفل reentrancy سليم.
 * لكن حين ينقطع الاتصال بقاعدة البيانات، لا يفشل الاستعلام فوراً: ينتظر مهلة
 * التجمّع كاملة (10s افتراضياً) ثم يرمي P2024. فتصير دورة الإشعارات المستغرقة
 * ~10s متلاصقة مع فاصلها البالغ 10s، أي محاولةً متصلة بلا انقطاع طوال مدة
 * الانقطاع، كل واحدة تشغل منتظِراً في التجمّع عشر ثوانٍ.
 *
 * قياس فعلي من جهاز المستخدم: 119 فشل مجدول، 100% منها داخل نوافذ انقطاع
 * شبكة، صفر خارجها. النتيجة سجلّ يفيض بآلاف الأسطر يغرق فيه أي عطل حقيقي.
 *
 * هذا ليس إخفاءً للخطأ: أوّل فشل يُسجَّل كاملاً، والتعافي يُسجَّل، وعدد ما
 * سُكِت عنه يُذكر صراحةً. ما نمنعه هو تكرار السطر نفسه بلا معلومة جديدة.
 */

/** أقصى انتظار بين المحاولات — يبقى النظام مستجيباً عند عودة القاعدة */
const MAX_BACKOFF_MS = 5 * 60_000;

export interface BackoffState {
  /** عدد الإخفاقات المتتالية */
  failures: number;
  /** أقرب لحظة يُسمح فيها بمحاولة جديدة */
  nextAttemptAt: number;
  /** كم دورة سُكِت عنها منذ آخر سطر سجلّ */
  suppressed: number;
}

export function createBackoff(): BackoffState {
  return { failures: 0, nextAttemptAt: 0, suppressed: 0 };
}

/** هل نتخطّى هذه الدورة لأن التراجع لم ينتهِ بعد؟ */
export function shouldSkip(state: BackoffState, now = Date.now()): boolean {
  if (state.failures === 0) return false;
  if (now >= state.nextAttemptAt) return false;
  state.suppressed++;
  return true;
}

/**
 * يُسجّل نجاح دورة ويعيد نصّ التعافي إن كان النظام متعثّراً قبلها.
 * يعيد null عند التشغيل الطبيعي فلا يُكتب شيء.
 */
export function recordSuccess(state: BackoffState): string | null {
  if (state.failures === 0) return null;
  const msg =
    `استُؤنف الاتصال بقاعدة البيانات بعد ${state.failures} محاولة فاشلة` +
    (state.suppressed > 0 ? ` (${state.suppressed} دورة مُتخطّاة)` : "");
  state.failures = 0;
  state.nextAttemptAt = 0;
  state.suppressed = 0;
  return msg;
}

/**
 * يُسجّل فشل دورة ويحسب موعد المحاولة القادمة.
 * يعيد نصّاً للتسجيل، أو null إن كان هذا تكراراً صامتاً لفشل معروف.
 */
export function recordFailure(state: BackoffState, baseMs: number, now = Date.now()): string | null {
  state.failures++;
  const delay = Math.min(baseMs * 2 ** (state.failures - 1), MAX_BACKOFF_MS);
  state.nextAttemptAt = now + delay;

  // أوّل فشل يُسجَّل كاملاً — هو الذي يحمل السبب. ثم نُسجّل عند كل تصعيد
  // في التراجع فقط، فيبقى للسجلّ أثر دون أن يغرق.
  if (state.failures === 1 || delay >= MAX_BACKOFF_MS) {
    const skipped = state.suppressed > 0 ? ` — سُكِت عن ${state.suppressed} دورة` : "";
    state.suppressed = 0;
    return `المحاولة القادمة بعد ${Math.round(delay / 1000)} ثانية${skipped}`;
  }
  return null;
}
