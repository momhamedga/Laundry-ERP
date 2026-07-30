import { prisma } from "../../src/lib/prisma.js";
import { TEST_SCHEMA } from "./test-db-url.js";

/**
 * أدوات قاعدة البيانات لطبقة التكامل. تُعيد تصدير نفس عميل Prisma المفرد الذي
 * يستخدمه التطبيق (src/lib/prisma) - فالبذور/الإفراغ والطلبات عبر HTTP تعمل كلها
 * على نفس الاتصال وschema=integration_test.
 */
export { prisma };

/**
 * Neon Serverless يُعلّق الحوسبة بعد خمول، فأول اتصال قد يفشل بينما تستيقظ
 * (P1001 "Can't reach database server"). نعيد المحاولة بتراجع قصير - مرونة بنية
 * اختبار قياسية مع قواعد serverless، لا علاقة لها بمنطق التطبيق.
 */
async function withDbRetry<T>(fn: () => Promise<T>, attempts = 6): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const transient = /reach database server|P1001|Timed out|Connection|ECONNRESET/i.test(msg);
      if (!transient) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

/** إيقاظ حوسبة Neon قبل السويت (مع إعادة محاولة) حتى لا يفشل أول اختبار ببرود البدء. */
export async function warmup(): Promise<void> {
  await withDbRetry(() => prisma.$queryRawUnsafe("SELECT 1"));
}

let cachedTables: string[] | null = null;

async function truncatableTables(): Promise<string[]> {
  if (cachedTables) return cachedTables;
  const rows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `select table_name from information_schema.tables
       where table_schema = '${TEST_SCHEMA}' and table_type = 'BASE TABLE'
         and table_name <> '_prisma_migrations'`,
  );
  cachedTables = rows.map((r) => `"${TEST_SCHEMA}"."${r.table_name}"`);
  return cachedTables;
}

/**
 * يُفرغ كل جداول schema الاختبار في عبارة واحدة (جولة شبكة واحدة) مع RESTART
 * IDENTITY وCASCADE لاحترام المفاتيح الأجنبية. يُستدعى في beforeEach لعزل تامّ.
 */
export async function resetDatabase(): Promise<void> {
  const tables = await withDbRetry(() => truncatableTables());
  if (tables.length === 0) return;
  await withDbRetry(() =>
    prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`),
  );
}
