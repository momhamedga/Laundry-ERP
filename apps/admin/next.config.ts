import path from "node:path";
import type { NextConfig } from "next";

/**
 * Vercel يبني ويستضيف بنفسه ولا يستهلك خرج standalone؛ بل تجاهله يوفّر نسخ
 * شجرة node_modules كاملة في كل بناء. نُبقي standalone هو الافتراضي كي لا
 * يتغيّر سلوك Electron ولا أوامر البناء المحلّية إطلاقاً، ونُسقطه فقط حين
 * تُعلن المنصّة عن نفسها بمتغيّرها القياسي VERCEL=1.
 */
const onVercel = process.env.VERCEL === "1";

/**
 * يمنع نشراً صامتاً معطوباً على Vercel.
 *
 * عنوان الـ API له قيمة احتياطية `http://localhost:4000` يعتمد عليها بناء
 * Electron عمداً — الخادم هناك محلّي فعلاً. لكن البناء نفسه على Vercel بلا
 * ضبط المتغيّر يُنتج حزمة تطلب localhost من متصفّح الزائر، فتفشل كل الطلبات
 * بأخطاء شبكة غامضة، وقد تصيب خدمةً تعمل على جهازه هو. البناء ينجح، والنشر
 * يبدو سليماً، ولا شيء يشير إلى السبب.
 *
 * نفشل عند البناء بدل ذلك — وعلى Vercel وحده، فلا يتأثّر Electron ولا التطوير.
 */
if (onVercel && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL غير مضبوط.\n" +
      "  بدونه ستطلب الواجهة http://localhost:4000 من متصفّح الزائر.\n" +
      "  اضبطه في إعدادات المشروع على Vercel، مثال:\n" +
      "    NEXT_PUBLIC_API_URL=https://api.<نطاقك>/api/v1",
  );
}

const nextConfig: NextConfig = {
  /**
   * Standalone: يُخرج خادم Next مكتفياً ذاتياً (.next/standalone) ليُشغَّل داخل
   * Electron كعملية Node مدمجة دون إعادة كتابة الواجهة. إضافي 100% ومتوافق رجعياً:
   * تشغيل dev و`next start` العاديّان لا يتأثران.
   */
  ...(onVercel ? {} : { output: "standalone" as const }),
  /**
   * جذر تتبّع الملفات = جذر الـ monorepo، حتى يلتقط standalone كل تبعيات pnpm
   * المرفوعة (وإلا يفشل الخادم المُجمّع بـMODULE_NOT_FOUND). يؤثّر على خرج
   * standalone فقط - لا يمسّ dev/next start أو أي سلوك تشغيل.
   */
  outputFileTracingRoot: path.join(process.cwd(), "..", ".."),
};

export default nextConfig;
