import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Standalone: يُخرج خادم Next مكتفياً ذاتياً (.next/standalone) ليُشغَّل داخل
   * Electron كعملية Node مدمجة دون إعادة كتابة الواجهة. إضافي 100% ومتوافق رجعياً:
   * تشغيل dev و`next start` العاديّان لا يتأثران.
   */
  output: "standalone",
  /**
   * جذر تتبّع الملفات = جذر الـ monorepo، حتى يلتقط standalone كل تبعيات pnpm
   * المرفوعة (وإلا يفشل الخادم المُجمّع بـMODULE_NOT_FOUND). يؤثّر على خرج
   * standalone فقط - لا يمسّ dev/next start أو أي سلوك تشغيل.
   */
  outputFileTracingRoot: path.join(process.cwd(), "..", ".."),
};

export default nextConfig;
