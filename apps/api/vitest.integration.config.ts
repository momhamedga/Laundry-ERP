import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";
import { buildIntegrationDatabaseUrl } from "./tests-integration/setup/test-db-url.js";

/**
 * إعداد طبقة اختبارات التكامل (منفصل عن vitest.config.ts للوحدات).
 *
 * يعمل مقابل قاعدة PostgreSQL حقيقية (Neon) داخل schema معزول (integration_test)
 * عبر HTTP حقيقي (supertest على createApp) وPrisma حقيقي. لا Mock.
 *
 * الرابط يُشتق وقت تحميل الإعداد من apps/api/.env (المستثنى من git) بحيث لا يُخزَّن
 * أي سرّ في هذا الملف. التنفيذ تسلسلي بعملية واحدة لأن كل السويتات تتشارك نفس
 * الschema وتُفرغه بين الاختبارات (TRUNCATE) - التوازي سيسبّب تداخل بيانات.
 */
loadEnv(); // يملأ process.env من apps/api/.env (لا يطبع شيئاً)

const DATABASE_URL = buildIntegrationDatabaseUrl(process.env.DATABASE_URL);

export default defineConfig({
  resolve: {
    extensionAlias: { ".js": [".ts", ".js"] },
  },
  test: {
    environment: "node",
    include: ["tests-integration/**/*.test.ts"],
    globalSetup: ["./tests-integration/setup/global-setup.ts"],
    setupFiles: ["./tests-integration/setup/vitest.setup.ts"],
    // شبكة حقيقية إلى Neon: مهل أوسع من الوحدات
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // عامل واحد تسلسلي - عزل بيانات موثوق عبر السويتات على schema مشترك،
    // وأقل عدد اتصالات إلى Neon (Vitest 4: خيارات المجمّع على المستوى الأعلى).
    pool: "forks",
    maxWorkers: 1,
    minWorkers: 1,
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL,
      // أسرار JWT: تُؤخذ من .env إن وُجدت، وإلا قيم اختبار ≥32 حرفاً تُرضي env.ts
      JWT_ACCESS_SECRET:
        process.env.JWT_ACCESS_SECRET ?? "integration-access-secret-at-least-32-characters",
      JWT_REFRESH_SECRET:
        process.env.JWT_REFRESH_SECRET ?? "integration-refresh-secret-at-least-32-characters",
      // البريد/النسخ الاحتياطي السحابي غير مُهيّأ عمداً: المزوّدات ترفض بلطف
      // (configured=false) بلا كسر أي طلب - نختبر السلوك الحقيقي غير المُهيّأ.
    },
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage-integration",
      reporter: ["text", "text-summary", "json-summary"],
      // طبقة التكامل تقيس الأجزاء التي تتطلّب قاعدة/شبكة: repositories/controllers/
      // routes/services/middlewares. نستثني ما لا يُشغَّل هنا فعلاً (bootstrap/PDF).
      include: ["src/**/*.ts"],
      exclude: [
        "src/server.ts",
        "src/lib/pdf.ts",
        "src/**/*.scheduler.ts",
        "src/**/*.d.ts",
      ],
    },
  },
});
