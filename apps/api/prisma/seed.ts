import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/bcrypt.js";

/**
 * Seed أولي: مستخدم Admin افتراضي
 * ⚠️ غيّر كلمة السر فور أول تسجيل دخول في الإنتاج
 */
const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@laundry.local";
const ADMIN_PASSWORD = "Admin@12345";

async function main(): Promise<void> {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      name: "System Admin",
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log(`✅ Admin user ready: ${admin.email} (${admin.id})`);
  console.log(`   Password: ${ADMIN_PASSWORD} — change it after first login!`);
}

main()
  .catch((err: unknown) => {
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
