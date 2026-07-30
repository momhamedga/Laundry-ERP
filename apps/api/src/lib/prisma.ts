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
    // شبكة عالٍ)، فمعاملة تفاعلية متعددة الجولات قد تتجاوز مهلة Prisma الافتراضية
    // (5s) لأسباب شبكية بحتة لا علاقة لها بالمنطق. نرفع المهلة لبيئة الاختبار حصراً.
    // الإنتاج والتطوير (NODE_ENV != "test") لا يتأثران إطلاقاً - سلوك مطابق تماماً.
    ...(env.NODE_ENV === "test"
      ? { transactionOptions: { timeout: 20_000, maxWait: 15_000 } }
      : {}),
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}
