import { defineConfig } from "vitest/config";

/**
 * إعداد Vitest للـ API. المشروع NodeNext يستورد بامتداد .js صريح، فنُخبر Vite
 * أن يجرّب .ts أولاً عند حلّ أي specifier ينتهي بـ.js (extensionAlias) - يتيح
 * اختبار الوحدات المصدرية مباشرة بلا build وسيط.
 *
 * الاختبارات هنا وحدات نقيّة (منطق أعمال/تحقّق/صلاحيات) لا تلمس قاعدة البيانات
 * ولا الشبكة، فتعمل حتميّاً في CI بلا Postgres. اختبارات التكامل الحيّة تُوثَّق
 * في TESTING.md وتُشغَّل يدويّاً مقابل خادم/قاعدة حقيقية (خارج بوابة CI).
 */
export default defineConfig({
  resolve: {
    extensionAlias: { ".js": [".ts", ".js"] },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // قيم بيئة وهمية تُرضي مُتحقّق config/env.ts في CI بلا ملف .env حقيقي
    // (تُضبط قبل تحميل أي وحدة، فلا يُنفَّذ process.exit). لا أسرار حقيقية هنا.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@localhost:5432/laundry_test",
      JWT_ACCESS_SECRET: "test-access-secret-at-least-32-characters-long",
      JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-characters-long",
    },
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "text-summary", "json-summary", "lcov"],
      include: ["src/**/*.ts"],
      // طبقة الوحدات (Unit) تغطّي منطق الأعمال/التحقّق/الأدوات النقيّة. الطبقات
      // التي تتطلّب قاعدة بيانات/شبكة (repositories/controllers/routes/الخادم)
      // تُغطّى بطبقة التكامل الحيّة الموثّقة في TESTING.md، فتُستثنى من مقام تغطية
      // الوحدات لئلّا تُعطي رقماً مضلِّلاً (فصل قياسي بين طبقتي الاختبار).
      exclude: [
        "src/server.ts",
        "src/app.ts",
        "src/config/**",
        "src/lib/prisma.ts",
        "src/**/index.ts",
        "src/**/*.routes.ts",
        "src/**/*.controller.ts",
        "src/**/*.repository.ts",
        "src/**/*.dto.ts",
        "src/middlewares/**",
        "src/**/*.integration.ts",
        "src/**/*.scheduler.ts",
        "src/**/*.sse.ts",
        "**/*.d.ts",
      ],
    },
  },
});
