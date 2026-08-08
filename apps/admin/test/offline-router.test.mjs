import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * حراسة منطق التوجيه بين الخادم والقاعدة المحلّية.
 *
 * المنطق منسوخ هنا حرفياً من src/lib/offline-router.ts لأن الأصل وحدة TSX
 * تعتمد على zustand و window، وتشغيلها يتطلّب حزمة اختبار متصفّح كاملة.
 * ما نحرسه هنا هو القرار نفسه: متى نذهب محلّياً ومتى نُبقي الخطأ ظاهراً —
 * وهو ما يقرّر إن كان المستخدم سيُنقذ أم سيرى شاشة خطأ.
 */

function looksLikeConnectivityFailure(err) {
  const e = err;
  if (!e) return false;
  if (!e.response) return e.code !== "ERR_CANCELED";
  if (e.response.status === 503) return true;
  if (e.response.status !== 500) return false;
  const body = e.response.data;
  return typeof body?.message === "string" && body.message.includes("قاعدة البيانات");
}

test("انقطاع القاعدة يُوجَّه محلّياً", () => {
  const cases = [
    [{ code: "ERR_NETWORK" }, "الخادم المحلّي نفسه لا يستجيب"],
    [{ response: { status: 503 } }, "الخادم حيّ لكن /health يقول القاعدة بعيدة"],
    [
      {
        response: {
          status: 500,
          data: { message: "تعذّر الاتصال بقاعدة البيانات. تحقّق من اتصال الإنترنت ثم أعد المحاولة." },
        },
      },
      "رسالتنا العربية الفعلية عند P2024",
    ],
  ];
  for (const [err, label] of cases) {
    assert.equal(looksLikeConnectivityFailure(err), true, label);
  }
});

test("الأخطاء الحقيقية تبقى ظاهرة ولا تُخفى خلف مسار محلّي", () => {
  const cases = [
    [{ response: { status: 401, data: { message: "Invalid credentials" } } }, "بيانات دخول خاطئة"],
    [{ response: { status: 400, data: { message: "Validation error" } } }, "تحقّق فاشل"],
    [{ response: { status: 409, data: { message: "رقم الهاتف مستخدم" } } }, "تعارض سجلّ"],
    [{ response: { status: 403, data: { message: "غير مصرّح" } } }, "صلاحية مرفوضة"],
    [
      { response: { status: 500, data: { message: "حدث خطأ غير متوقّع في النظام." } } },
      "خطأ برمجي في الخادم — ليس انقطاعاً",
    ],
    [{ code: "ERR_CANCELED" }, "المستخدم ألغى الطلب"],
  ];
  for (const [err, label] of cases) {
    assert.equal(looksLikeConnectivityFailure(err), false, label);
  }
});

test("مهلة الطلب تُعامَل كانقطاع", () => {
  // axios يضبط ECONNABORTED بلا response عند تجاوز المهلة، وهو ما يحدث فعلياً
  // حين تنتظر Prisma عشر ثوانٍ قبل أن تُقرّ بأن القاعدة بعيدة
  assert.equal(looksLikeConnectivityFailure({ code: "ECONNABORTED" }), true);
});
