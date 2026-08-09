import type { MetadataRoute } from "next";

/**
 * منع الفهرسة على مستوى الموقع كلّه.
 *
 * وسم `robots` في البيانات الوصفية يغطّي الصفحات المُقدَّمة من الخادم، لكنه
 * لا يُنتج ملفّ /robots.txt الذي تطلبه الزواحف أولاً. هذه لوحة إدارة خاصّة:
 * لا شيء فيها يُقصد أن يُفهرَس، وظهور صفحة الدخول في نتائج البحث يحوّلها
 * إلى هدف معروف لمحاولات التخمين.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
