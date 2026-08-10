import { describe, expect, it, beforeAll } from "vitest";
import { z } from "zod";
import { configureZodArabic } from "../../src/config/zod-locale.js";

/** أي محرف عربي — يكفي للتمييز عن النصّ الإنجليزي الافتراضي */
const HAS_ARABIC = /[؀-ۿ]/;

describe("رسائل تحقّق Zod بالعربية", () => {
  beforeAll(() => {
    configureZodArabic();
  });

  it("الحقل الغائب يُبلَّغ عنه بأنه مطلوب، بلا أسماء أنواع برمجية", () => {
    const res = z.object({ name: z.string() }).safeParse({});
    expect(res.success).toBe(false);
    const message = res.error!.issues[0].message;
    expect(message).toBe("هذا الحقل مطلوب.");
    expect(message).not.toMatch(/string|undefined/i);
  });

  it.each([
    ["بريد غير صالح", () => z.email().safeParse("nope")],
    ["نصّ أقصر من الحدّ", () => z.string().min(8).safeParse("a")],
    ["رقم أكبر من الحدّ", () => z.number().max(5).safeParse(9)],
    ["قيمة خارج القائمة", () => z.enum(["A", "B"]).safeParse("C")],
    ["نوع غير مطابق", () => z.number().safeParse("نصّ")],
  ])("%s ⇒ رسالة عربية لا إنجليزية", (_label, run) => {
    const res = run();
    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toMatch(HAS_ARABIC);
  });

  it("الرسالة المخصّصة المكتوبة في المخطّط تبقى غالبة على الترجمة", () => {
    const res = z.string().min(8, "كلمة السر 8 أحرف على الأقل").safeParse("a");
    expect(res.error!.issues[0].message).toBe("كلمة السر 8 أحرف على الأقل");
  });
});
