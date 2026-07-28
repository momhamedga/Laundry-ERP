import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * إعداد Vitest لواجهة الإدارة. بيئة jsdom لاختبار مكوّنات React، وplugin-react
 * لتحويل JSX (Runtime التلقائي لـReact 19)، وaliasـ@ ← src ليطابق مسارات المشروع.
 * الاختبارات نقيّة/DOM فقط (بلا شبكة) - تُشغَّل حتميّاً في CI.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "text-summary", "json-summary", "lcov"],
      // طبقة الوحدات تقيس منطق العرض/الأدوات النقيّة (lib/constants). المكوّنات
      // التفاعلية والصفحات تُغطَّى باختبار العرض (jsdom) واختبار التكامل الحيّ،
      // فلا تُدرَج في مقام تغطية الوحدات (فصل قياسي بين الطبقات).
      include: ["src/lib/format.ts", "src/constants/permissions.ts"],
      exclude: ["src/**/*.d.ts"],
    },
  },
});
