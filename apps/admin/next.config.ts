import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Standalone: يُخرج خادم Next مكتفياً ذاتياً (.next/standalone) ليُشغَّل داخل
   * Electron كعملية Node مدمجة دون إعادة كتابة الواجهة. إضافي 100% ومتوافق رجعياً:
   * تشغيل dev و`next start` العاديّان لا يتأثران.
   */
  output: "standalone",
};

export default nextConfig;
