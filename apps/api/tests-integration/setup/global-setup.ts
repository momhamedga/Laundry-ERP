import { execSync } from "node:child_process";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { buildIntegrationDatabaseUrl, TEST_SCHEMA } from "./test-db-url.js";

/**
 * إعداد عام يُشغَّل مرة واحدة قبل كل سويتات التكامل، وتفكيك بعدها.
 *
 * الإعداد: ترحيل حتمي (idempotent) لكل الهجرات إلى schema=integration_test على Neon.
 *   إن كان الschema مُرحّلاً سابقاً فالأمر سريع (لا هجرات معلّقة).
 *
 * التفكيك: بيئياً - DROP_TEST_SCHEMA=1 يُسقط الschema بالكامل (تنظيف تامّ كما طُلب)،
 *   وإلا يُفرَغ كل الجداول (TRUNCATE) فلا تبقى أي بيانات بين عمليات التشغيل.
 */
export default async function setup(): Promise<() => Promise<void>> {
  loadEnv();
  const url = buildIntegrationDatabaseUrl(process.env.DATABASE_URL);

  // ترحيل الschema المعزول (اتصال مباشر - يدعم DDL). idempotent.
  execSync("pnpm exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url, NODE_ENV: "test" },
    stdio: "inherit",
  });

  return async () => {
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      if (process.env.DROP_TEST_SCHEMA === "1") {
        await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
        console.log(`\n🧹 dropped schema ${TEST_SCHEMA}`);
      } else {
        const rows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
          `select table_name from information_schema.tables
             where table_schema = '${TEST_SCHEMA}' and table_type = 'BASE TABLE'
               and table_name <> '_prisma_migrations'`,
        );
        if (rows.length > 0) {
          const list = rows.map((r) => `"${TEST_SCHEMA}"."${r.table_name}"`).join(", ");
          await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
        }
        console.log(`\n🧹 truncated ${TEST_SCHEMA} (schema kept; set DROP_TEST_SCHEMA=1 to drop)`);
      }
    } finally {
      await prisma.$disconnect();
    }
  };
}
