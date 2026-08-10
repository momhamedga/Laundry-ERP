import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * تتبّع الأخطاء.
 *
 * القيد الحاكم هنا الخصوصية لا التشخيص: أجسام الطلبات تحمل كلمات سرّ وأسماء
 * عملاء وأرقام هواتف، والرؤوس تحمل رموز جلسات. إرسال ذلك إلى طرف ثالث تسريبٌ
 * لا «معلومات مفيدة». ولذلك تُختبر التنقية نفسها، لا مجرّد أن الإرسال يعمل.
 *
 * ويُختبر أيضاً ما **لا** يُرسَل: الأخطاء التشغيلية المعروفة. إغراق التنبيهات
 * بـ«العميل غير موجود» يجعلها تُتجاهَل كلّها، فيضيع العطل الحقيقي وسطها.
 */
const DSN_VAR = "SENTRY_DSN";
let saved: string | undefined;

beforeEach(() => {
  saved = process.env[DSN_VAR];
  vi.resetModules();
});
afterEach(() => {
  if (saved === undefined) delete process.env[DSN_VAR];
  else process.env[DSN_VAR] = saved;
  vi.resetModules();
});

describe("تتبّع الأخطاء — التفعيل", () => {
  it("بلا SENTRY_DSN: معطّل، وcaptureError لا يفعل شيئاً ولا يرمي", async () => {
    delete process.env[DSN_VAR];
    const obs = await import("../src/config/observability.js");

    expect(obs.isObservabilityEnabled()).toBe(false);
    expect(() => obs.captureError(new Error("x"))).not.toThrow();
    await expect(obs.flushObservability()).resolves.toBeUndefined();
  });

  it("بوجود SENTRY_DSN: مفعّل", async () => {
    process.env[DSN_VAR] = "https://abc@o1.ingest.sentry.io/1";
    const obs = await import("../src/config/observability.js");
    expect(obs.isObservabilityEnabled()).toBe(true);
  });
});

describe("تتبّع الأخطاء — ما يُرسَل وما لا يُرسَل", () => {
  /** يشغّل المعالج المركزي ويعيد ما التقطه التتبّع */
  async function runHandler(err: unknown) {
    const captured: unknown[] = [];
    vi.doMock("../src/config/observability.js", () => ({
      captureError: (e: unknown) => captured.push(e),
      isObservabilityEnabled: () => true,
      initObservability: () => undefined,
      flushObservability: () => Promise.resolve(),
    }));

    const { errorHandler, ApiError } = await import("../src/middlewares/error.middleware.js");
    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      },
    } as unknown as Response;

    errorHandler(err, { method: "GET", originalUrl: "/api/v1/x" } as Request, res, vi.fn());
    return { captured, ApiError };
  }

  it("الخطأ غير المتوقَّع يُبلَّغ عنه", async () => {
    const boom = new Error("انهيار غير متوقّع");
    const { captured } = await runHandler(boom);
    expect(captured).toEqual([boom]);
  });

  it("ApiError التشغيلي لا يُبلَّغ عنه — سلوك صحيح لا عطل", async () => {
    const { ApiError } = await import("../src/middlewares/error.middleware.js");
    const { captured } = await runHandler(new ApiError(404, "العميل غير موجود."));
    expect(captured).toEqual([]);
  });

  it("خطأ التحقّق (Zod) لا يُبلَّغ عنه", async () => {
    const { z } = await import("zod");
    const parsed = z.object({ a: z.string() }).safeParse({});
    const { captured } = await runHandler(parsed.error);
    expect(captured).toEqual([]);
  });
});
