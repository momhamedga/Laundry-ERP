import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "../../src/constants/error-codes.js";
import { ApiError, errorHandler } from "../../src/middlewares/error.middleware.js";

/**
 * الرموز عقدٌ بين الخادم والواجهة: الواجهة تتفرّع عليها سلوكياً (شاشة «رابط
 * منتهٍ»، تلوين حقل، التحويل للأوفلاين). كانت تلك الفروع مبنية على نصّ الرسالة
 * الإنجليزي فأسقطها التعريب بصمت — هذه الاختبارات تمنع تكرار ذلك.
 */
function runHandler(err: unknown): { status: number; body: Record<string, unknown> } {
  let status = 0;
  let body: Record<string, unknown> = {};
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json(payload: Record<string, unknown>) {
      body = payload;
      return this;
    },
  } as unknown as Response;

  errorHandler(err, {} as Request, res, vi.fn());
  return { status, body };
}

describe("رموز الأخطاء في استجابة الخادم", () => {
  it("ApiError بلا رمز لا يُضيف الحقل أصلاً", () => {
    const { status, body } = runHandler(new ApiError(404, "العميل غير موجود."));
    expect(status).toBe(404);
    expect(body).toEqual({ success: false, message: "العميل غير موجود." });
    expect(body).not.toHaveProperty("code");
  });

  it("ApiError برمز يُرسله مع الرسالة", () => {
    const { status, body } = runHandler(
      new ApiError(400, "كلمة السر الحالية غير صحيحة.", ERROR_CODES.WRONG_CURRENT_PASSWORD),
    );
    expect(status).toBe(400);
    expect(body.code).toBe("WRONG_CURRENT_PASSWORD");
    expect(body.message).toBe("كلمة السر الحالية غير صحيحة.");
  });

  it("تعذُّر بلوغ قاعدة البيانات يحمل DB_UNREACHABLE — عليه يعتمد التحوّل للأوفلاين", () => {
    const prismaErr = Object.assign(new Error("timed out fetching a new connection"), {
      code: "P2024",
    });
    const { status, body } = runHandler(prismaErr);
    expect(status).toBe(500);
    expect(body.code).toBe("DB_UNREACHABLE");
  });

  it("خطأ عام غير متعلّق بقاعدة البيانات لا يحمل رمزاً", () => {
    const { status, body } = runHandler(new Error("boom"));
    expect(status).toBe(500);
    expect(body).not.toHaveProperty("code");
  });
});
