import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  /**
   * اختياري عمداً: غيابه لا يُسقط الخادم عند الإقلاع (بريد هو Soft Dependency) -
   * EmailProvider يرفض الإرسال فعلياً برسالة واضحة إن استُدعي بلا مفتاح حقيقي
   */
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().min(1).default("Laundry ERP <no-reply@laundry-erp.local>"),
  FRONTEND_URL: z.string().min(1).default("http://localhost:3000"),

  /**
   * ==================== Backup (Phase 6) ====================
   * BACKUP_DIR اختياري - غيابه يعني مجلد افتراضي داخل apps/api (storage/backups)
   * يُنشأ تلقائياً. باقي المتغيّرات أسرار السحابة (Scaffold): وجودها يجعل المزوّد
   * configured=true؛ غيابها configured=false بلا إسقاط الخادم (نفس نمط RESEND_API_KEY).
   */
  BACKUP_DIR: z.string().optional(),
  /** مفتاح تشفير AES-256 (32 بايت hex/utf8) - غيابه يُعطّل التشفير فعلياً حتى لو فُعِّل بالإعدادات */
  BACKUP_ENCRYPTION_KEY: z.string().optional(),
  // Cloud (Scaffold) - S3 وR2 وBackblaze كلها متوافقة مع S3
  BACKUP_S3_BUCKET: z.string().optional(),
  BACKUP_S3_REGION: z.string().optional(),
  BACKUP_S3_ACCESS_KEY_ID: z.string().optional(),
  BACKUP_S3_SECRET_ACCESS_KEY: z.string().optional(),
  BACKUP_S3_ENDPOINT: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((o) => o.trim()),
  isProduction: parsed.data.NODE_ENV === "production",
};
