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
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}
