import { PrismaClient } from "@prisma/client";
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
