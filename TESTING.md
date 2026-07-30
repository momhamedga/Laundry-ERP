# Testing Strategy

نظام اختبار متعدّد الطبقات لـ Laundry ERP. الهدف: بوّابة جودة حتمية في CI + ثقة
في منطق الأعمال الحرج، مع فصل واضح بين الطبقات.

## طبقات الاختبار

| الطبقة | الأداة | تُشغَّل في CI؟ | ما تُغطّيه |
|---|---|---|---|
| **Unit (API)** | Vitest (Node) | ✅ نعم | منطق الأعمال/التحقّق/الأدوات النقيّة — بلا قاعدة بيانات أو شبكة |
| **Unit (Admin)** | Vitest + jsdom + Testing Library | ✅ نعم | أدوات العرض، مرآة الصلاحيات، وعرض مكوّن (component render) |
| **Integration (API)** | Vitest + supertest + Prisma + Postgres حقيقي (Neon، schema معزول) | ⚙️ عند توفّر DB | التدفّق الكامل عبر HTTP الحقيقي: Controllers→Services→Repositories→DB، RBAC/تجاوزات/انتحال/جلسات، معاملات وسلامة تحت التزامن، إغلاق اليوم وقفل الفترة |

### طبقة التكامل (Phase 10.6) — حقيقية ومعزولة
**16 ملف اختبار · 164 اختباراً · كلها خضراء.** تعمل مقابل **PostgreSQL حقيقي** داخل
schema مستقل اسمه `integration_test` على نفس مثيل Neon، فلا تلمس بيانات التطوير في
`public` إطلاقاً. لا Mock — HTTP حقيقي عبر `supertest` على `createApp()`، وPrisma
حقيقي، ومعاملات حقيقية. تغطية الطبقة (نطاق الخادم الكامل: controllers/routes/
repositories/services/middlewares): **53% عبارات / 56% أسطر** — مقيسة فعلياً.

```bash
pnpm --filter @laundry/api test:integration            # يتطلّب apps/api/.env بـDATABASE_URL صالح
pnpm --filter @laundry/api test:integration:coverage   # مع قياس التغطية
DROP_TEST_SCHEMA=1 pnpm --filter @laundry/api test:integration   # تنظيف: إسقاط الschema بعد التشغيل
```

**كيف تعمل:** `vitest.integration.config.ts` يشتقّ رابط الاختبار من `.env` وقت التحميل
(مضيف مباشر + `schema=integration_test`)، و`globalSetup` يطبّق `prisma migrate deploy`
(idempotent)، وكل اختبار يبدأ بـ`TRUNCATE` لكل الجداول (عزل تامّ). التنفيذ تسلسلي
بعامل واحد لتقليل اتصالات Neon. مهلة المعاملة تُرفَع في `NODE_ENV=test` فقط (زمن شبكة
Neon البعيد) دون أي تأثير على الإنتاج.

### لماذا ليست بوّابة CI افتراضية؟
تتطلّب Postgres مُهيّأة. بوّابة الدمج الحتمية تبقى **طبقة الوحدات**. لتفعيل التكامل في
CI: أضِف خدمة `postgres` (أو سرّ `DATABASE_URL` لفرع Neon) ثم `pnpm --filter @laundry/api
test:integration` — الإعداد جاهز، لا يحتاج سوى قاعدة في البيئة.

### نتيجة تكامل موثّقة (سلامة تحت التزامن)
كشف اختبار التزامن أن توليد رقم الطلب التسلسلي (`sequence = آخر رقم + 1`) يتسابق تحت
الإنشاء المتوازي: بعض الطلبات المتزامنة قد تفشل بـ500 عند تصادم قيد `orderNumber`
الفريد (P2002). **سلامة البيانات محفوظة دائماً** — لا يُخزَّن رقم مكرّر إطلاقاً (القيد
الفريد يحمي التكامل). توصية مستقبلية (خارج نطاق 10.6، تجنّباً لتغيير المنطق): تسلسل
الترقيم عبر advisory lock أو إعادة محاولة عند P2002.

## التشغيل محليّاً

```bash
# الكل
pnpm --filter @laundry/api test          # وحدات الـ API
pnpm --filter @laundry/admin test        # وحدات الواجهة

# مع التغطية
pnpm --filter @laundry/api test:coverage
pnpm --filter @laundry/admin test:coverage

# مراقبة أثناء التطوير
pnpm --filter @laundry/api test:watch
```

## ما يُغطّيه الاختبار الآلي حاليّاً

**API (`apps/api/tests/`) — 46 اختباراً:**
- `auth/permissions` — RBAC + دمج التجاوزات (`computeEffectivePermissions`): منح/سحب/تجاهل غير معروف/عدم تغيير المصدر.
- `auth/jwt` — توقيع/تحقّق + ادّعاء الانتحال `imp` + رفض التوكين المشوَّه/المُلاعَب.
- `hr/hr-constants` — مساعدات التاريخ (`toDateOnly`/`inclusiveDays`/`todayDate`).
- `hr/payroll.service` — حساب الراتب: `net = base + بدلات + مكافآت + إضافي − (خصومات + غياب)`، إضافي ×1.5، رفض الفترة المكرّرة/بلا موظفين.
- `hr/hr` + `validators/*` — قواعد Zod (ترتيب تواريخ الإجازة/الرواتب، cuid، القيم غير السالبة، force، سبب إعادة الفتح).
- `day-closing/constants` + `day-closing/pre-close.service` — منطق فحص ما قبل الإغلاق (blocking/warning/info + بوّابة force).
- `notifications/recipients` — سلامة خريطة أدوار المستقبِلين + كشف الأحداث المُوجَّهة.

**Admin (`apps/admin/tests/`) — 17 اختباراً:**
- `format` — عملة/تاريخ/وقت (بما فيها null → «—»).
- `permissions` — مرآة RBAC الأمامية (`hasPermission`/`hasAnyRole` + سلامة الخريطة).
- `hr-format` + `day-format` — خرائط التسميات/الشارات + `minutesToHhMm` + `differenceTone`.
- `metric-card` — عرض مكوّن React فعلي في jsdom (عنوان/قيمة + نبرة destructive).

## فلسفة التغطية (بصدق)

طبقة الوحدات تقيس **منطق الأعمال النقيّ** فقط. تُستثنى من المقام: `repositories`
(أغلفة Prisma رقيقة)، `controllers`/`routes` (تجميع HTTP)، والخادم — لأنها من
اختصاص طبقة التكامل الحيّة. لذلك:

- تغطية وحدات الواجهة على طبقة المنطق (`lib`/`constants`): **~59%**.
- تغطية وحدات الـ API عالميّاً منخفضة لأن وحدات كثيرة قديمة (orders/payments/inventory/…)
  ليس لها اختبارات وحدة بعد، ومنطقها مُتحقَّق عبر التكامل الحيّ. **الأرقام حقيقية
  ومقيسة — لم يُدَّعَ 95%.** رفعُها هو عمل مخطَّط (انظر أدناه).

## المتبقّي لبلوغ تغطية Enterprise كاملة
1. طبقة تكامل آلية في CI (خدمة Postgres + `migrate deploy` + مجموعة HTTP).
2. اختبارات وحدة لكل خدمة/وحدة قديمة (orders/payments/inventory/loyalty/barcode/backup/reports).
3. اختبارات مكوّنات/hooks أوسع للواجهة (نماذج/جداول/حوارات) عبر Testing Library.
4. اختبارات أداء محمّلة (k6/Artillery) لسيناريوهات الأحجام الكبيرة.
