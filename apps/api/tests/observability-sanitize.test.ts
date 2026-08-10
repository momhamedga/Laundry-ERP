import { describe, expect, it } from "vitest";
import { sanitizeEvent } from "../src/config/observability.js";

/**
 * تنقية بيانات التتبّع — في ملف مستقلّ عمداً.
 *
 * سويت "ما يُرسَل" تحاكي وحدة observability كاملةً بـvi.doMock، والمحاكاة تظلّ
 * فعّالة لبقية الملف فتحجب أي تصدير حقيقي منه. الفصل يضمن أن ما يُختبَر هنا هو
 * الدالة الفعلية لا بديلها.
 */
describe("تتبّع الأخطاء — تنقية البيانات الحسّاسة", () => {
  /**
   * تُختبر دالة التنقية مباشرةً لا عبر محاكاة Sentry: المحاكاة تختبر آلية
   * التمرير، والمطلوب اختبار ما يخرج فعلاً — والفرق بينهما هو الفرق بين
   * تسريبٍ ولا تسريب.
   */
  const sanitize = (event: Record<string, unknown>) =>
    sanitizeEvent(event as never) as Record<string, any>;

  it("جسم الطلب لا يُرسَل إطلاقاً — يحمل كلمات السرّ وبيانات العملاء", () => {
    const event = sanitize({
      request: {
        data: { password: "Admin@12345", customerPhone: "01214115724" },
        headers: { "content-type": "application/json" },
      },
    });

    expect(event.request.data).toBeUndefined();
    expect(JSON.stringify(event)).not.toContain("Admin@12345");
    expect(JSON.stringify(event)).not.toContain("01214115724");
    expect(event.request.headers["content-type"]).toBe("application/json");
  });

  it("رؤوس المصادقة والكوكيز تُحذف، والبقية تبقى", () => {
    const event = sanitize({
      request: {
        headers: {
          Authorization: "Bearer eyJhbGciOi...",
          Cookie: "refreshToken=abc",
          "x-restore-confirm": "true",
          "user-agent": "Chrome/131",
        },
      },
    });

    const asText = JSON.stringify(event);
    expect(asText).not.toContain("eyJhbGciOi");
    expect(asText).not.toContain("refreshToken");
    expect(event.request.headers["user-agent"]).toBe("Chrome/131");
  });

  it("الكوكيز وسلسلة الاستعلام تُحذفان", () => {
    const event = sanitize({
      request: { cookies: { session: "s" }, query_string: "phone=01214115724" },
    });

    expect(event.request.cookies).toBeUndefined();
    expect(event.request.query_string).toBeUndefined();
    expect(JSON.stringify(event)).not.toContain("01214115724");
  });

  it("حدث بلا request يمرّ كما هو بلا انهيار", () => {
    const event = sanitize({ message: "عطل ما" });
    expect(event.message).toBe("عطل ما");
  });
});
