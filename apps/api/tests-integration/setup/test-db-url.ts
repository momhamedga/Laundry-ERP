/**
 * اشتقاق رابط قاعدة اختبارات التكامل من DATABASE_URL.
 *
 * - يستخدم المضيف المباشر (بإزالة "-pooler") لأن الترحيلات/DDL وعبارات prepared
 *   أكثر موثوقية على الاتصال المباشر من موزّع PgBouncer (Neon).
 * - يفرض schema=integration_test لعزل كامل عن بيانات التطوير في schema=public.
 *   لا يلمس أي جدول في public إطلاقاً.
 * - يحافظ على بقية معاملات الرابط الأصلي (sslmode/channel_binding…) كما هي، فلا
 *   يفرض SSL: يعمل مع Neon (يبقي sslmode=require) ومع Postgres محلي في CI (بلا SSL).
 *
 * الرابط الحقيقي (بكلمة المرور) يأتي من apps/api/.env محليّاً أو من سرّ CI؛ هذه
 * الدالة نقيّة ولا تطبع الرابط أبداً.
 */
export const TEST_SCHEMA = "integration_test";

export function buildIntegrationDatabaseUrl(raw: string | undefined): string {
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      "DATABASE_URL مطلوب لاشتقاق رابط قاعدة اختبارات التكامل (حمّل apps/api/.env أو سرّ CI أولاً)",
    );
  }
  const direct = raw.replace("-pooler", "");
  const [base, query = ""] = direct.split("?");
  const params = new URLSearchParams(query);
  params.set("schema", TEST_SCHEMA); // يعزل عن public دون لمس بقية المعاملات
  return `${base}?${params.toString()}`;
}
