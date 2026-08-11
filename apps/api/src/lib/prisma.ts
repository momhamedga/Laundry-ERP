import { createRequire } from "node:module";
import { PrismaClient, Prisma } from "@prisma/client";
import { env } from "../config/env.js";

/**
 * عميل Prisma واحد لكامل التطبيق (Singleton)
 * يمنع فتح اتصالات متعددة أثناء الـ hot-reload في التطوير
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ["error"] : ["warn", "error"],
    // بيئة الاختبار فقط: طبقة التكامل تعمل مقابل قاعدة سحابية بعيدة (Neon، زمن
    // شبكة ~150ms)، فمعاملة تفاعلية متعددة الجولات قد تتجاوز مهلة Prisma الافتراضية
    // (5s) لأسباب شبكية بحتة. علاوةً على ذلك، القفل الاستشاري لترقيم الطلبات يُسلسِل
    // المعاملات المتزامنة، فتتراكم زمن-الشبكة للطلب الأخير تحت اختبار التزامن. نرفع
    // المهلة لبيئة الاختبار حصراً لاستيعاب هذا التراكم عبر WAN. الإنتاج/التطوير
    // (NODE_ENV != "test") وقاعدة CI المحلية (زمن < 1ms) لا تتأثر إطلاقاً.
    ...(env.NODE_ENV === "test"
      ? { transactionOptions: { timeout: 60_000, maxWait: 30_000 } }
      : {}),
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}

/**
 * تشخيص مؤقّت (QA) — أي عميل Prisma يُحمَّل فعلاً وقت التشغيل؟
 *
 * سببه: على Railway كل مسارات المصروفات تُعيد 500 بينما كل النماذج القديمة
 * تعمل، والفرضية أن العميل المُحمَّل قديمٌ لا يعرف `Expense`. هذا يطبع الحقيقة
 * بدل التخمين. لا يطبع رابط قاعدة ولا سرّاً ولا أي متغيّر بيئة — أسماء نماذج
 * ومسارات وحدات فقط.
 *
 * يُحذف فور حسم التشخيص.
 */
function logPrismaDiagnostic(): void {
  const tag = "[prisma-diagnostic]";
  const safe = (fn: () => string): string => {
    try {
      return fn();
    } catch (err) {
      return `unresolved (${err instanceof Error ? err.name : "error"})`;
    }
  };
  const require_ = createRequire(import.meta.url);

  console.log(`${tag} clientVersion=${Prisma.prismaVersion?.client ?? "unknown"}`);
  console.log(`${tag} expenseDelegate=${typeof (prisma as unknown as Record<string, unknown>).expense === "object"}`);
  console.log(`${tag} branchDelegate=${typeof (prisma as unknown as Record<string, unknown>).branch === "object"}`);
  console.log(`${tag} clientPath=${safe(() => require_.resolve("@prisma/client"))}`);
  console.log(`${tag} generatedPath=${safe(() => require_.resolve(".prisma/client"))}`);
  console.log(`${tag} cwd=${process.cwd()}`);

  const models = Prisma.dmmf?.datamodel?.models?.map((m) => m.name) ?? [];
  console.log(`${tag} dmmfModelCount=${models.length} hasExpenseInDmmf=${models.includes("Expense")}`);

  if (typeof (prisma as unknown as Record<string, unknown>).expense !== "object") {
    console.error(`${tag} EXPENSE_DELEGATE_MISSING`);
  }
}

logPrismaDiagnostic();
