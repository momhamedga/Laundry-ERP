/**
 * اشتقاق رابط قاعدة اختبارات التكامل من DATABASE_URL الحقيقي (Neon).
 *
 * - يستخدم المضيف المباشر (بإزالة "-pooler") لأن الترحيلات/DDL وعبارات prepared
 *   أكثر موثوقية على الاتصال المباشر من موزّع PgBouncer.
 * - يفرض schema=integration_test لعزل كامل عن بيانات التطوير في schema=public.
 *   لا يلمس أي جدول في public إطلاقاً.
 *
 * الرابط الحقيقي (بكلمة المرور) يبقى في apps/api/.env المستثنى من git؛ هذه الدالة
 * نقيّة ولا تطبع الرابط أبداً.
 */
export const TEST_SCHEMA = "integration_test";

export function buildIntegrationDatabaseUrl(raw: string | undefined): string {
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      "DATABASE_URL مطلوب لاشتقاق رابط قاعدة اختبارات التكامل (حمّل apps/api/.env أولاً)",
    );
  }
  const direct = raw.replace("-pooler", "");
  const base = direct.split("?")[0];
  return `${base}?sslmode=require&schema=${TEST_SCHEMA}`;
}
